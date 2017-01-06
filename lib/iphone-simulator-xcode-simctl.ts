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

import { IPhoneSimulatorNameGetter } from "./iphone-simulator-name-getter";

export class XCodeSimctlSimulator extends IPhoneSimulatorNameGetter implements ISimulator {
	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
	public defaultDeviceIdentifier = "iPhone 6";

	private simctl: ISimctl = null;

	constructor() {
		super();
		this.simctl = new Simctl();
	}

	public getDevices(): IDevice[] {
		return this.simctl.getDevices();
	}

	public getSdks(): ISdk[] {
		let devices = this.simctl.getDevices();
		return _.map(devices, device => {
			return {
				displayName: `iOS ${device.runtimeVersion}`,
				version: device.runtimeVersion
			};
		});
	}

	public run(applicationPath: string, applicationIdentifier: string): void {
		let device = this.getDeviceToRun();
		let currentBootedDevice = _.find(this.getDevices(), device => this.isDeviceBooted(device));
		if (currentBootedDevice && (currentBootedDevice.name.toLowerCase() !== device.name.toLowerCase() || currentBootedDevice.runtimeVersion !== device.runtimeVersion)) {
			this.killSimulator();
		}

		this.startSimulator(device);
		if (!options.skipInstall) {
			this.simctl.install(device.id, applicationPath);
		}
		let launchResult = this.simctl.launch(device.id, applicationIdentifier);

		if (options.logging) {
			this.printDeviceLog(device.id, launchResult);
		}
	}

	public sendNotification(notification: string): void {
		let device = this.getBootedDevice();
		if (!device) {
			errors.fail("Could not find device.");
		}

		this.simctl.notifyPost("booted", notification);
	}

	public getApplicationPath(deviceId: string, applicationIdentifier: string): string {
		return this.simctl.getAppContainer(deviceId, applicationIdentifier);
	}

	public getInstalledApplications(deviceId: string): IApplication[] {
		return common.getInstalledApplications(deviceId);
	}

	public installApplication(deviceId: string, applicationPath: string): void {
		return this.simctl.install(deviceId, applicationPath);
	}

	public uninstallApplication(deviceId: string, appIdentifier: string): void {
		return this.simctl.uninstall(deviceId, appIdentifier, { skipError: true });
	}

	public startApplication(deviceId: string, appIdentifier: string): string {
		return this.simctl.launch(deviceId, appIdentifier);
	}

	public stopApplication(deviceId: string, cfBundleExecutable: string): string {
		try {
			return childProcess.execSync(`killall ${cfBundleExecutable}`, { skipError: true });
		} catch (e) {
		}
	}

	public printDeviceLog(deviceId: string, launchResult?: string): any {
		return common.printDeviceLog(deviceId, launchResult);
	}

	public getDeviceLogProcess(deviceId: string): any {
		return common.getDeviceLogProcess(deviceId);
	}

	private getDeviceToRun(): IDevice {
		let devices = this.simctl.getDevices(),
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
	}

	private isDeviceBooted(device: IDevice): boolean {
		return device.state === 'Booted';
	}

	private getBootedDevice(): IDevice {
		let devices = this.simctl.getDevices();
		return _.find(devices, device => this.isDeviceBooted(device));
	}

	public startSimulator(device?: IDevice): void {
		device = device || this.getDeviceToRun();
		if (!this.isDeviceBooted(device)) {
			common.startSimulator(device.id);
			// startSimulaltor doesn't always finish immediately, and the subsequent
			// install fails since the simulator is not running.
			// Give it some time to start before we attempt installing.
			utils.sleep(1000);
		}
	}

	private killSimulator(): Promise<any> {
		return childProcess.spawn("pkill", ["-9", "-f", "Simulator"]);
	}
}
