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
var $ = require("NodObjC");

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
			return _.map(devices, device => device.runtimeVersion);
		}).future<ISdk[]>()();
	}

	public run(applicationPath: string, applicationIdentifier: string): IFuture<void> {
		return (() => {
			let device = this.getDeviceToRun().wait();

			if(!this.isDeviceBooted(device)) {
				this.startSimulator(device).wait();
				// startSimulaltor doesn't always finish immediately, and the subsequent
				// install fails since the simulator is not running.
				// Give it some time to start before we attempt installing.
				utils.sleep(1000);
			}

			this.simctl.install(device.id, applicationPath).wait();
			this.simctl.launch(device.id, applicationIdentifier).wait();
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
}