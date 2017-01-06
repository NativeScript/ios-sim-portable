import child_process = require("child_process");
import fs = require("fs");
import os = require("os");
import path = require("path");
import util = require("util");

import errors = require("./errors");
import options = require("./options");
import xcode = require("./xcode");

import { XCodeSimctlSimulator } from "./iphone-simulator-xcode-simctl";

import * as _ from "lodash";

export class iPhoneSimulator implements IiPhoneSimulator {
	private simulator: ISimulator = null;

	constructor() {
		this.simulator = this.createSimulator();
	}

	public run(applicationPath: string, applicationIdentifier: string): void {
		if (!fs.existsSync(applicationPath)) {
			errors.fail("Path does not exist ", applicationPath);
		}

		if (options.device) {
			let deviceNames = _.unique(_.map(this.simulator.getDevices(), (device: IDevice) => device.name));
			if (!_.contains(deviceNames, options.device)) {
				errors.fail(`Unable to find device ${options.device}. The valid device names are ${deviceNames.join(", ")}`);
			}
		}

		let sdkVersion = options.sdkVersion || options.sdk;
		if (sdkVersion) {
			let runtimeVersions = _.unique(_.map(this.simulator.getDevices(), (device: IDevice) => device.runtimeVersion));
			if (!_.contains(runtimeVersions, sdkVersion)) {
				errors.fail(`Unable to find sdk ${sdkVersion}. The valid runtime versions are ${runtimeVersions.join(", ")}`);
			}
		}

		return this.simulator.run(applicationPath, applicationIdentifier);
	}

	public printDeviceTypes(): void {
		let devices = this.simulator.getDevices();
		_.each(devices, device => console.log(`Device Identifier: ${device.fullId}. ${os.EOL}Runtime version: ${device.runtimeVersion} ${os.EOL}`));
	}

	public printSDKS(): void {
		let sdks = this.simulator.getSdks();
		_.each(sdks, (sdk) => {
			let output = `    Display Name: ${sdk.displayName} ${os.EOL}    Version: ${sdk.version} ${os.EOL}`;
			if (sdk.rootPath) {
				output += `    Root path: ${sdk.rootPath} ${os.EOL}`;
			}
			console.log(output);
		});
	}

	public sendNotification(notification: string): void {
		if (!notification) {
			errors.fail("Notification required.");
		}

		return this.simulator.sendNotification(notification);
	}

	public createSimulator(): ISimulator {
		return new XCodeSimctlSimulator();
	}
}

