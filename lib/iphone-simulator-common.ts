import childProcess = require("./child-process");
import xcode = require("./xcode");
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

export function getInstalledApplications(deviceId: string): IApplication[] {
	let rootApplicationsPath = path.join(osenv.home(), `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Containers/Bundle/Application`);
	if (!fs.existsSync(rootApplicationsPath)) {
		rootApplicationsPath = path.join(osenv.home(), `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Applications`);
	}

	// since ios 14 - the Applications folder is not created on a fresh simulator, so if it doesn't exist
	// we know there are no applications installed.
	if(!fs.existsSync(rootApplicationsPath)) {
		return []
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
				appIdentifier: getBundleIdentifier(plistFilePath),
				path: path.join(fullApplicationPath, applicationName)
			});
		}
	});

	return result;
}

export function startSimulator(deviceId: string): void {
	let simulatorPath = path.resolve(xcode.getPathFromXcodeSelect(), "Applications", "Simulator.app");
	let args = ["open", simulatorPath];
	if (deviceId) {
		args.push( '--args', '-CurrentDeviceUDID', deviceId)
	}
	childProcess.execSync(args.join(" "));
}

function getBundleIdentifier(plistFilePath: string): string {
	let plistData: any;
	try {
		plistData = bplistParser.parseFileSync(plistFilePath)[0];
	} catch (err) {
		let content = fs.readFileSync(plistFilePath).toString();
		plistData = plist.parse(content);
	}

	return plistData && plistData.CFBundleIdentifier;
}
