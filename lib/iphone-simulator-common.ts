///<reference path="./.d.ts"/>
"use strict";

import childProcess = require("./child-process");
import Future = require("fibers/future");
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import xcode = require("./xcode");
import * as _ from "lodash";

let bplistParser = require("bplist-parser");
let plist = require("plist");
let osenv = require("osenv");
let isDeviceLogOperationStarted = false;
let pid: string;

export function getInstalledApplications(deviceId: string): IFuture<IApplication[]> {
	return (() => {
		let rootApplicationsPath = path.join(osenv.home(), `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Containers/Bundle/Application`);
		if(!fs.existsSync(rootApplicationsPath)) {
			rootApplicationsPath = path.join(osenv.home(), `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Applications`);
		}
		let applicationGuids = fs.readdirSync(rootApplicationsPath);
		let result: IApplication[] = [];
		_.each(applicationGuids, applicationGuid => {
			let fullApplicationPath = path.join(rootApplicationsPath, applicationGuid);
			if (fs.statSync(fullApplicationPath).isDirectory()) {
				let applicationDirContents = fs.readdirSync(fullApplicationPath);
				let applicationName = _.find(applicationDirContents, fileName => path.extname(fileName) === ".app");
				let plistFilePath = path.join(fullApplicationPath, applicationName, "Info.plist");
				result.push({
					guid: applicationGuid,
					appIdentifier: getBundleIdentifier(plistFilePath).wait(),
					path: path.join(fullApplicationPath, applicationName)
				});
			}
		});

		return result;
	}).future<IApplication[]>()();
}

export function printDeviceLog(deviceId: string, launchResult?: string): void {
	if(launchResult) {
		pid = launchResult.split(":")[1].trim();
	}

	if(!isDeviceLogOperationStarted) {
		let logFilePath = path.join(osenv.home(), "Library", "Logs", "CoreSimulator", deviceId, "system.log");
		let childProcess = require("child_process").spawn("tail", ['-f', '-n', '1', logFilePath]);
		if (childProcess.stdout) {
			childProcess.stdout.on("data", (data: NodeBuffer) => {
				let deviceLog = data.toString();
				if ((pid && deviceLog.indexOf("[" + pid + "]") < 0) ||
					(deviceLog.indexOf("SecTaskCopyDebugDescription") !== -1) ||
					(deviceLog.indexOf("assertion failed:") != -1 && deviceLog.indexOf("libxpc.dylib") !== -1)) {
					return;
				}
				// CONSOLE LOG messages comme in the following form:
				// <date> <domain> <app>[pid] CONSOLE LOG file:///location:row:column: <actual message goes here>
				// This code removes the first part and leaves only the message as specified by the call to console.log function.
				// This removes the unnecessary information and makes the log consistent with Android.
				let logIndex = deviceLog.indexOf("CONSOLE LOG");
				if (logIndex !== -1) {
					let i = 4; 
					while(i) { logIndex = deviceLog.indexOf(':', logIndex+1); i --; }
					if (logIndex > 0) {
						deviceLog = "JS:" + deviceLog.substring(logIndex+1, deviceLog.length);
					}
				}
				process.stdout.write(deviceLog);
			});
		}

		if (childProcess.stderr) {
			childProcess.stderr.on("data", (data: string) => {
				let dataAsString = data.toString();
				if(pid) {
					if (dataAsString.indexOf(`[${pid}]`) > -1) {
						process.stdout.write(dataAsString);
					}
				} else {
					process.stdout.write(dataAsString);
				}
				process.stdout.write(data.toString());
			});
		}

		isDeviceLogOperationStarted = true;
	}
}

export function startSimulator(deviceId: string): IFuture<void> {
	return (() => {
		let simulatorPath = path.resolve(xcode.getPathFromXcodeSelect().wait(), "Applications", "Simulator.app");
		let args = [simulatorPath, '--args', '-CurrentDeviceUDID', deviceId];
		childProcess.spawn("open", args).wait();
	}).future<void>()();
}

function parseFile(plistFilePath: string): IFuture<any> {
	let future = new Future<any>();
	bplistParser.parseFile(plistFilePath, (err: Error, obj: any) => {
		if(err) {
			future.throw(err);
		} else {
			future.return(obj);
		}
	});
	return future;
}

function getBundleIdentifier(plistFilePath: string): IFuture<string> {
	return (() => {
		let plistData: any;
		try {
			plistData = parseFile(plistFilePath).wait()[0];
		} catch (err) {
			let content = fs.readFileSync(plistFilePath).toString();
			plistData = plist.parse(content);
		}

		return plistData && plistData.CFBundleIdentifier;
	}).future<string>()();
}