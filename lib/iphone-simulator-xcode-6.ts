///<reference path="./.d.ts"/>
"use strict";
import childProcess = require("./child-process");
import * as errors from "./errors";
import * as options from "./options";
import * as utils from "./utils";

import Future = require("fibers/future");
import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import * as os from "os";
import * as _ from "lodash";

import common = require("./iphone-simulator-common");
import { Simctl } from "./simctl";
let $ = require("nodobjc");
let osenv = require("osenv");

import iPhoneSimulatorBaseLib = require("./iphone-interop-simulator-base");

export class XCode6Simulator extends iPhoneSimulatorBaseLib.IPhoneInteropSimulatorBase implements IInteropSimulator {

	public defaultDeviceIdentifier: string;

	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";

	private cachedDevices: IDevice[];
	private simctl: ISimctl;

	constructor() {
		super(this);

		this.defaultDeviceIdentifier = "iPhone-4s";
		this.cachedDevices = null;
		this.simctl = new Simctl();
	}

	public setSimulatedDevice(config: any): void {
		let device = this.getDeviceByName().rawDevice;
		config("setDevice", device);
	}

	public getSimulatedDevice(): any {
		return this.getDeviceByName().rawDevice;
	}

	public getDevices(): IFuture<IDevice[]> {
		return this.execute(() => this.devices, { canRunMainLoop: false });
	}

	public getSdks(): IFuture<ISdk[]> {
		return this.execute(() => this.sdks, { canRunMainLoop: false });
	}

	public getApplicationPath(deviceId: string, applicationIdentifier: string): IFuture<string> {
		return (() => {
			let applications = this.getInstalledApplications(deviceId).wait();
			let application = _.find(applications, app => app.appIdentifier === applicationIdentifier);
			return application ? application.path : null;
		}).future<string>()();
	}

	public getInstalledApplications(deviceId: string): IFuture<IApplication[]> {
		return common.getInstalledApplications(deviceId);
	}

	public installApplication(deviceId: string, applicationPath: string): IFuture<void> {
		return this.simctl.install(deviceId, applicationPath);
	}

	public uninstallApplication(deviceId: string, appIdentifier: string): IFuture<void> {
		return this.simctl.uninstall(deviceId, appIdentifier);
	}

	public startApplication(deviceId: string, appIdentifier: string): IFuture<string> {
		return this.simctl.launch(deviceId, appIdentifier);
	}

	public stopApplication(deviceId: string, cfBundleExecutable: string): IFuture<string> {
		try {
			return childProcess.exec(`killall ${cfBundleExecutable}.app`);
		} catch(e) {
		}
	}

	public printDeviceLog(deviceId: string, launchResult?: string): any {
		return common.printDeviceLog(deviceId, launchResult);
	}

	public getDeviceLogProcess(deviceId: string): any {
		return common.getDeviceLogProcess(deviceId);
	}

	public startSimulator(): IFuture<void> {
		let device = this.devices[0];
		return common.startSimulator(device.id);
	}

	private get devices(): IDevice[] {
		if(!this.cachedDevices) {
			this.cachedDevices = [];

			let deviceSet = $.classDefinition.getClassByName("SimDeviceSet")("defaultSet");
			let devices = deviceSet("availableDevices");
			let count = devices("count");
			if(count > 0) {
				for(let index=0; index<count; index++) {
					let device = devices("objectAtIndex", index);

					let deviceIdentifier = device("deviceType")("identifier").toString();
					let deviceIdentifierPrefixIndex = deviceIdentifier.indexOf(XCode6Simulator.DEVICE_IDENTIFIER_PREFIX);
					let deviceIdentifierWithoutPrefix = deviceIdentifier.substring(deviceIdentifierPrefixIndex + XCode6Simulator.DEVICE_IDENTIFIER_PREFIX.length + 1);

					let runtimeVersion = device("runtime")("versionString").toString();

					this.cachedDevices.push({
						name: deviceIdentifierWithoutPrefix,
						id: deviceIdentifierWithoutPrefix,
						fullId: this.buildFullDeviceIdentifier(deviceIdentifier),
						runtimeVersion: runtimeVersion,
						rawDevice: device
					});
				}
			}
		}

		return this.cachedDevices;
	}

	private get sdks(): ISdk[] {
		let systemRootClass = $.classDefinition.getClassByName("DTiPhoneSimulatorSystemRoot");
		let roots = systemRootClass("knownRoots");
		let count = roots("count");

		let sdks: ISdk[] = [];
		for(let index=0; index < count; index++) {
			let root = roots("objectAtIndex", index);

			let displayName = root("sdkDisplayName").toString();
			let version = root("sdkVersion").toString();
			let rootPath = root("sdkRootPath").toString();

			sdks.push({ displayName, version, rootPath });
		}

		return sdks;
	}

	public sendNotification(notification: string): IFuture<void> {
		let action = () => {
			let device = this.getSimulatedDevice();
			if (!device) {
				errors.fail("Could not find device.");
			}

			let result = device("postDarwinNotification", $(notification), "error", null);
			if (!result) {
				errors.fail("Could not send notification: " + notification);
			}
		};

		return this.execute(action, { canRunMainLoop: false });
	}

	private getDeviceByName(): IDevice {
		let devices = this.getDevices().wait();
		let device = _.find(devices, (device) => device.name === this.getSimulatorName());
		if(!device) {
			errors.fail("Unable to find device with name ", this.getSimulatorName());
		}

		return device;
	}

	private buildFullDeviceIdentifier(deviceIdentifier: string): string {
		return util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceIdentifier);
	}
}
