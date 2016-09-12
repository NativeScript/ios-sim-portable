///<reference path="./.d.ts"/>
"use strict";

import childProcess = require("./child-process");
import xcode = require("./xcode");
import Future = require("fibers/future");
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as _ from "lodash";

let bplistParser = require("bplist-parser");
let plist = require("plist");
let osenv = require("osenv");
let isDeviceLogOperationStarted = false;
let pid: string;
let deviceLogChildProcess: any;

export function getInstalledApplications(deviceId: string): IFuture<IApplication[]> {
	return (() => {
		let rootApplicationsPath = path.join(osenv.home(), `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Containers/Bundle/Application`);
		if (!fs.existsSync(rootApplicationsPath)) {
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

export function printDeviceLog(deviceId: string, launchResult?: string): any {
	if (launchResult) {
		pid = launchResult.split(":")[1].trim();
	}

	if (!isDeviceLogOperationStarted) {
		let logFilePath = path.join(osenv.home(), "Library", "Logs", "CoreSimulator", deviceId, "system.log");
		deviceLogChildProcess = require("child_process").spawn("tail", ['-f', '-n', '1', logFilePath]);
		if (deviceLogChildProcess.stdout) {
			deviceLogChildProcess.stdout.on("data", (data: NodeBuffer) => {
				let dataAsString = data.toString();
				if (pid) {
					if (dataAsString.indexOf(`[${pid}]`) > -1) {
						process.stdout.write(dataAsString);
					}
				} else {
					process.stdout.write(dataAsString);
				}
			});
		}

		if (deviceLogChildProcess.stderr) {
			deviceLogChildProcess.stderr.on("data", (data: string) => {
				let dataAsString = data.toString();
				if (pid) {
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

	return deviceLogChildProcess;
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
		if (err) {
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
