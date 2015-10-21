///<reference path="./.d.ts"/>
"use strict";
import errors = require("./errors");
import options = require("./options");
import utils = require("./utils");
import util = require("util");
import os = require("os");
var $ = require("nodobjc");

import iPhoneSimulatorBaseLib = require("./iphone-interop-simulator-base");

export class XCode6Simulator extends iPhoneSimulatorBaseLib.IPhoneInteropSimulatorBase implements IInteropSimulator {

	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
	private static DEFAULT_DEVICE_IDENTIFIER = "iPhone-4s";

	private cachedDevices: IDevice[] = null;

	constructor() {
		super(this);
	}

	public setSimulatedDevice(config: any): void {
		let device = this.getDeviceByName().device;
		config("setDevice", device);
	}

	public getSimulatedDevice(): any {
		return this.getDeviceByName().device;
	}

	public getDevices(): IFuture<IDevice[]> {
		return this.execute(() => this.devices, { canRunMainLoop: false });
	}

	public getSdks(): IFuture<ISdk[]> {
		return this.execute(() => this.sdks, { canRunMainLoop: false });
	}

	private get devices(): IDevice[] {
		if(!this.cachedDevices) {
			this.cachedDevices = [];

			var deviceSet = $.classDefinition.getClassByName("SimDeviceSet")("defaultSet");
			var devices = deviceSet("availableDevices");
			var count = devices("count");
			if(count > 0) {
				for(var index=0; index<count; index++) {
					var device = devices("objectAtIndex", index);

					var deviceIdentifier = device("deviceType")("identifier").toString();
					var deviceIdentifierPrefixIndex = deviceIdentifier.indexOf(XCode6Simulator.DEVICE_IDENTIFIER_PREFIX);
					var deviceIdentifierWithoutPrefix = deviceIdentifier.substring(deviceIdentifierPrefixIndex + XCode6Simulator.DEVICE_IDENTIFIER_PREFIX.length + 1);

					var runtimeVersion = device("runtime")("versionString").toString();

					this.cachedDevices.push({
						name: "",
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
		var systemRootClass = $.classDefinition.getClassByName("DTiPhoneSimulatorSystemRoot");
		var roots = systemRootClass("knownRoots");
		var count = roots("count");

		var sdks: ISdk[] = [];
		for(var index=0; index < count; index++) {
			var root = roots("objectAtIndex", index);

			var displayName = root("sdkDisplayName").toString();
			var version = root("sdkVersion").toString();
			var rootPath = root("sdkRootPath").toString();

			sdks.push({
				displayName: displayName,
				version: version,
				rootPath: rootPath
			});
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

	private get deviceName(): string {
		return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
	}

	private getDeviceByName(): any {
		let device = _.find(this.devices, (device) => device.name === this.deviceName);
		if(!device) {
			errors.fail("Unable to find device with name ", this.deviceName);
		}

		return device;
	}

	private buildFullDeviceIdentifier(deviceIdentifier: string): string {
		return util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceIdentifier);
	}
}