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

var $ = require("nodobjc");

export class iPhoneSimulator implements IiPhoneSimulator {
	private simulator: ISimulator = null;

	constructor() {
		this.simulator = this.createSimulator().wait();
	}

	public get validDeviceIdentifiers(): string[] {
		var devices = this.simulator.getDevices().wait();
		return _.map(devices, device => device.id);
	}

	public run(applicationPath: string, applicationIdentifier: string): IFuture<void> {
		if(!fs.existsSync(applicationPath)) {
			errors.fail("Path does not exist ", applicationPath);
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
			_.each(sdks, (sdk) => console.log([util.format("    Display Name: %s", sdk.displayName),
				util.format("    Version: %s", sdk.version),
				util.format("    Root path: %s", sdk.rootPath)].join(os.EOL)) );
		}).future<void>()();
	}

	public sendNotification(notification: string): IFuture<void> {
		if(!notification) {
			errors.fail("Notification required.");
		}

		return this.simulator.sendNotification(notification);
	}

	private createSimulator(): IFuture<ISimulator> {
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

