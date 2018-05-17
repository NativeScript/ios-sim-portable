import child_process = require("child_process");
import fs = require("fs");
import os = require("os");
import path = require("path");
import util = require("util");

import errors = require("./errors");
import xcode = require("./xcode");

import { XCodeSimctlSimulator } from "./iphone-simulator-xcode-simctl";

import * as _ from "lodash";

export class iPhoneSimulator implements IiPhoneSimulator {
	private simulator: ISimulator = null;

	constructor() {
		this.simulator = this.createSimulator();
	}

	public async run(applicationPath: string, applicationIdentifier: string, options: IOptions): Promise<string> {
		if (!fs.existsSync(applicationPath)) {
			errors.fail("Path does not exist ", applicationPath);
		}

		if (options.device) {
			const hasSuchDevice = _.find(await this.simulator.getDevices(), device => device.name === options.device || device.id === options.device);
			if (!hasSuchDevice) {
				errors.fail(`Unable to find device ${options.device}.`);
			}
		}

		let sdkVersion = options.sdkVersion || options.sdk;
		if (sdkVersion) {
			let runtimeVersions = _.unique(_.map(await this.simulator.getDevices(), (device: IDevice) => device.runtimeVersion));
			if (!_.contains(runtimeVersions, sdkVersion)) {
				errors.fail(`Unable to find sdk ${sdkVersion}. The valid runtime versions are ${runtimeVersions.join(", ")}`);
			}
		}

		return this.simulator.run(applicationPath, applicationIdentifier, options);
	}

	public async printDeviceTypes(): Promise<void> {
		let devices = await this.simulator.getDevices();
		_.each(devices, device => console.log(`Device Identifier: ${device.fullId}. ${os.EOL}Runtime version: ${device.runtimeVersion} ${os.EOL}`));
	}

	public async printSDKS(): Promise<void> {
		let sdks = await this.simulator.getSdks();
		_.each(sdks, (sdk) => {
			let output = `    Display Name: ${sdk.displayName} ${os.EOL}    Version: ${sdk.version} ${os.EOL}`;
			if (sdk.rootPath) {
				output += `    Root path: ${sdk.rootPath} ${os.EOL}`;
			}
			console.log(output);
		});
	}

	public sendNotification(notification: string, deviceId: string): Promise<void> {
		if (!notification) {
			errors.fail("Notification required.");
		}

		return this.simulator.sendNotification(notification, deviceId);
	}

	public createSimulator(): ISimulator {
		return new XCodeSimctlSimulator();
	}
}

