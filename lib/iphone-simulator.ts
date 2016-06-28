///<reference path="./.d.ts"/>
"use strict";

import child_process = require("child_process");
import fs = require("fs");
import Future = require("fibers/future");
import os = require("os");
import path = require("path");
import util = require("util");

import errors = require("./errors");
import options = require("./options");
import xcode = require("./xcode");

import xcode7SimulatorLib = require("./iphone-simulator-xcode-7");
import xcode6SimulatorLib = require("./iphone-simulator-xcode-6");
import xcode5SimulatorLib = require("./iphone-simulator-xcode-5");

import * as _ from "lodash";

var $ = require("nodobjc");

export class iPhoneSimulator implements IiPhoneSimulator {
	private simulator: ISimulator = null;

	constructor() {
		this.simulator = this.createSimulator().wait();
	}

	public run(applicationPath: string, applicationIdentifier: string): IFuture<void> {
		if(!fs.existsSync(applicationPath)) {
			errors.fail("Path does not exist ", applicationPath);
		}

		if(options.device) {
			let deviceNames = _.unique(_.map(this.simulator.getDevices().wait(), (device: IDevice) => device.name));
			if(!_.contains(deviceNames, options.device)) {
				errors.fail(`Unable to find device ${options.device}. The valid device names are ${deviceNames.join(", ")}`);
			}
		}

		let sdkVersion = options.sdkVersion || options.sdk;
		if(sdkVersion) {
			let runtimeVersions = _.unique(_.map(this.simulator.getDevices().wait(), (device: IDevice) => device.runtimeVersion));
			if(!_.contains(runtimeVersions, sdkVersion)) {
				errors.fail(`Unable to find sdk ${sdkVersion}. The valid runtime versions are ${runtimeVersions.join(", ")}`);
			}
		}

		return this.simulator.run(applicationPath, applicationIdentifier);
	}

	public printDeviceTypes(): IFuture<void> {
		return (() => {
			let devices = this.simulator.getDevices().wait();
			_.each(devices, device => console.log(`Device Identifier: ${device.fullId}. ${os.EOL}Runtime version: ${device.runtimeVersion} ${os.EOL}`));
		}).future<void>()();
	}

	public printSDKS(): IFuture<void> {
		return (() => {
			let sdks = this.simulator.getSdks().wait();
			_.each(sdks, (sdk) => {
				let output = `    Display Name: ${sdk.displayName} ${os.EOL}    Version: ${sdk.version} ${os.EOL}`;
				if(sdk.rootPath) {
					 output += `    Root path: ${sdk.rootPath} ${os.EOL}`;
				}
				console.log(output);
			});
		}).future<void>()();
	}

	public sendNotification(notification: string): IFuture<void> {
		if(!notification) {
			errors.fail("Notification required.");
		}

		return this.simulator.sendNotification(notification);
	}

	public createSimulator(): IFuture<ISimulator> {
		return (() => {
			let xcodeVersionData = xcode.getXcodeVersionData().wait();
			let majorVersion = xcodeVersionData.major;

			let simulator: ISimulator = null;

			if(majorVersion === "7") {
				simulator = new xcode7SimulatorLib.XCode7Simulator();
			} else if (majorVersion === "6") {
				simulator = new xcode6SimulatorLib.XCode6Simulator();
			} else if(majorVersion === "5") {
				simulator = new xcode5SimulatorLib.XCode5Simulator();
			} else {
				errors.fail(`Unsupported xcode version ${xcodeVersionData.major}.`);
			}

			return simulator;
		}).future<ISimulator>()();
	}
}

