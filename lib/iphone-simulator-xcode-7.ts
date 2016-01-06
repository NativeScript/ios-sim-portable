///<reference path="./.d.ts"/>
"use strict";

import childProcess = require("./child-process");
import errors = require("./errors");

import options = require("./options");
import path = require("path");
import { Simctl } from "./simctl";
import util = require("util");
import utils = require("./utils");
import xcode = require("./xcode");
var $ = require("nodobjc");
var osenv = require("osenv");

export class XCode7Simulator implements ISimulator {
	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
	private static DEFAULT_DEVICE_NAME = "iPhone 6";

	private simctl: ISimctl = null;

	constructor() {
		this.simctl = new Simctl();
	}

	public getDevices(): IFuture<IDevice[]> {
		return this.simctl.getDevices();
	}

	public getSdks(): IFuture<ISdk[]> {
		return (() => {
			let devices = this.simctl.getDevices().wait();
			return _.map(devices, device => {
				return {
					displayName: `iOS ${device.runtimeVersion}`,
					version: device.runtimeVersion
				};
			});
		}).future<ISdk[]>()();
	}

	public run(applicationPath: string, applicationIdentifier: string): IFuture<void> {
		return (() => {
			let device = this.getDeviceToRun().wait();
			let currentBootedDevice = _.find(this.getDevices().wait(), device => this.isDeviceBooted(device));
			if(currentBootedDevice && (currentBootedDevice.name.toLowerCase() !== device.name.toLowerCase() || currentBootedDevice.runtimeVersion !== device.runtimeVersion)) {
				this.killSimulator().wait();
			}

			if(!this.isDeviceBooted(device)) {
				this.startSimulator(device).wait();
				// startSimulaltor doesn't always finish immediately, and the subsequent
				// install fails since the simulator is not running.
				// Give it some time to start before we attempt installing.
				utils.sleep(1000);
			}

			this.simctl.install(device.id, applicationPath).wait();
			let launchResult = this.simctl.launch(device.id, applicationIdentifier).wait();

			if (options.logging) {
				let pid = launchResult.split(":")[1].trim();
				let logFilePath = path.join(osenv.home(), "Library", "Logs", "CoreSimulator", device.id, "system.log");

				let childProcess = require("child_process").spawn("tail", ['-f', '-n', '1', logFilePath]);
				if(childProcess.stdout) {
					childProcess.stdout.on("data", (data: NodeBuffer) => {
						let dataAsString = data.toString();
						if (dataAsString.indexOf(`[${pid}]`) > -1) {
							process.stdout.write(dataAsString);
						}
					});
				}

				if(childProcess.stderr) {
					childProcess.stderr.on("data", (data: string) => {
						let dataAsString = data.toString();
						if (dataAsString.indexOf(`[${pid}]`) > -1) {
							process.stdout.write(dataAsString);
						}
					});
				}
			}
		}).future<void>()();
	}

	public sendNotification(notification: string): IFuture<void> {
		return (() => {
			let device = this.getBootedDevice().wait();
			if (!device) {
				errors.fail("Could not find device.");
			}

			this.simctl.notifyPost("booted", notification).wait();
		}).future<void>()();
	}

	public getApplicationPath(deviceId: string, applicationIdentifier: string): IFuture<string> {
		return this.simctl.getAppContainer(deviceId, applicationIdentifier);
	}

	private getDeviceToRun(): IFuture<IDevice> {
		return (() => {
			let devices = this.simctl.getDevices().wait();
			let result = _.find(devices, (device: IDevice) => {
				if(options.sdkVersion && !options.device) {
					return device.runtimeVersion === options.sdkVersion;
				}

				if(options.device && !options.sdkVersion) {
					return device.name === options.device;
				}

				if(options.device && options.sdkVersion) {
					return device.runtimeVersion === options.sdkVersion && device.name === options.device;
				}

				if(!options.sdkVersion && !options.device) {
					return this.isDeviceBooted(device);
				}
			});

			if(!result) {
				result = _.find(devices, (device: IDevice) => device.name === XCode7Simulator.DEFAULT_DEVICE_NAME);
			}

			if(!result) {
				let sortedDevices = _.sortBy(devices, (device) => device.runtimeVersion);
				result = _.last(sortedDevices);
			}

			return result;
		}).future<IDevice>()();
	}

	private isDeviceBooted(device: IDevice): boolean {
		return device.state === 'Booted';
	}

	private getBootedDevice(): IFuture<IDevice> {
		return (() => {
			let devices = this.simctl.getDevices().wait();
			return _.find(devices, device => this.isDeviceBooted(device));
		}).future<IDevice>()();
	}

	private startSimulator(device: IDevice): IFuture<void> {
		return (() => {
			let simulatorPath = path.resolve(xcode.getPathFromXcodeSelect().wait(), "Applications", "Simulator.app");
			let args = [simulatorPath, '--args', '-CurrentDeviceUDID', device.id];
			childProcess.spawn("open", args).wait();
		}).future<void>()();
	}

	private killSimulator(): IFuture<any> {
		return childProcess.spawn("pkill", ["-9", "-f", "Simulator"]);
	}
}
