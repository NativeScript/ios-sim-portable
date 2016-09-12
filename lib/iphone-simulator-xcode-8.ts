///<reference path="./.d.ts"/>
"use strict";

import childProcess = require("./child-process");
import errors = require("./errors");

import common = require("./iphone-simulator-common");
import options = require("./options");
import path = require("path");
import { Simctl } from "./simctl";
import util = require("util");
import utils = require("./utils");
import xcode = require("./xcode");
import * as _ from "lodash";

import {IPhoneSimulatorNameGetter} from "./iphone-simulator-name-getter";

export class XCode8Simulator extends IPhoneSimulatorNameGetter implements ISimulator {
	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
	public defaultDeviceIdentifier = "iPhone 6";

	private simctl: ISimctl = null;

	constructor() {
		super();
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
			if (currentBootedDevice && (currentBootedDevice.name.toLowerCase() !== device.name.toLowerCase() || currentBootedDevice.runtimeVersion !== device.runtimeVersion)) {
				this.killSimulator().wait();
			}

			this.startSimulator(device).wait();
			if (!options.skipInstall) {
				this.simctl.install(device.id, applicationPath).wait();
			}
			let launchResult = this.simctl.launch(device.id, applicationIdentifier).wait();

			if (options.logging) {
				this.printDeviceLog(device.id, launchResult);
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

	public getInstalledApplications(deviceId: string): IFuture<IApplication[]> {
		return common.getInstalledApplications(deviceId);
	}

	public installApplication(deviceId: string, applicationPath: string): IFuture<void> {
		return this.simctl.install(deviceId, applicationPath);
	}

	public uninstallApplication(deviceId: string, appIdentifier: string): IFuture<void> {
		return this.simctl.uninstall(deviceId, appIdentifier, { skipError: true });
	}

	public startApplication(deviceId: string, appIdentifier: string): IFuture<string> {
		return this.simctl.launch(deviceId, appIdentifier);
	}

	public stopApplication(deviceId: string, cfBundleExecutable: string): IFuture<string> {
		try {
			return childProcess.exec(`killall ${cfBundleExecutable}`, { skipError: true });
		} catch (e) {
		}
	}

	public printDeviceLog(deviceId: string, launchResult?: string): any {
		return common.printDeviceLog(deviceId, launchResult);
	}

	private getDeviceToRun(): IFuture<IDevice> {
		return (() => {
			let devices = this.simctl.getDevices().wait(),
				sdkVersion = options.sdkVersion || options.sdk;

			let result = _.find(devices, (device: IDevice) => {
				if (sdkVersion && !options.device) {
					return device.runtimeVersion === sdkVersion;
				}

				if (options.device && !sdkVersion) {
					return device.name === options.device;
				}

				if (options.device && sdkVersion) {
					return device.runtimeVersion === sdkVersion && device.name === options.device;
				}

				if (!sdkVersion && !options.device) {
					return this.isDeviceBooted(device);
				}
			});

			if (!result) {
				result = _.find(devices, (device: IDevice) => device.name === this.defaultDeviceIdentifier);
			}

			if (!result) {
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

	public startSimulator(device?: IDevice): IFuture<void> {
		return (() => {
			device = device || this.getDeviceToRun().wait();
			if (!this.isDeviceBooted(device)) {
				common.startSimulator(device.id).wait();
				// startSimulaltor doesn't always finish immediately, and the subsequent
				// install fails since the simulator is not running.
				// Give it some time to start before we attempt installing.
				utils.sleep(1000);
			}
		}).future<void>()();
	}

	private killSimulator(): IFuture<any> {
		return childProcess.spawn("pkill", ["-9", "-f", "Simulator"]);
	}
}