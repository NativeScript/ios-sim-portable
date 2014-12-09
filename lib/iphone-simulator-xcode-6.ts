///<reference path="./.d.ts"/>
"use strict";
import errors = require("./errors");
import options = require("./options");
import utils = require("./utils");
import util = require("util");
import os = require("os");
var $ = require("NodObjC");

export class XCode6Simulator implements ISimulator {

	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
	private static DEFAULT_DEVICE_IDENTIFIER = "iPhone-4s";


	private availableDevices: IDictionary<IDevice>;

	constructor() {
		this.availableDevices = Object.create(null);
	}

	public get validDeviceIdentifiers(): string[] {
		var simDeviceSet = $.classDefinition.getClassByName("SimDeviceSet");
		var devicesInfo: string[] = [];

		if(simDeviceSet) {
			var deviceSet = simDeviceSet("defaultSet");
			var devices = deviceSet("availableDevices");

			var count = devices("count");
			for(var index=0; index < count; index++) {
				var device = devices("objectAtIndex", index);

				var deviceIdentifier = device("deviceType")("identifier").toString();
				var deviceIdentifierPrefixIndex = deviceIdentifier.indexOf(XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER);
				var deviceIdentifierWithoutPrefix = deviceIdentifier.substring(deviceIdentifierPrefixIndex + XCode6Simulator.DEVICE_IDENTIFIER_PREFIX.length + 2);

				var runtimeVersion = device("runtime")("versionString").toString();
				var deviceInfo = [util.format("Device Identifier: %s", deviceIdentifierWithoutPrefix),
					util.format("Runtime Version: %s", runtimeVersion)].join(os.EOL);
				devicesInfo.push(deviceInfo + os.EOL);
			}
		}

		return devicesInfo;
	}

	public setSimulatedDevice(config: any): void {
		var device = this.getDeviceByIdentifier(this.deviceIdentifier);
		config("setDevice", device);
	}

	private get deviceIdentifier(): string {
		return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
	}

	private getAvailableDevices(): IDictionary<IDevice> {
		if(_.isEmpty(this.availableDevices)) {
			var deviceSet = $.classDefinition.getClassByName("SimDeviceSet")("defaultSet");
			var devices = deviceSet("availableDevices");
			var count = devices("count");
			if(count > 0) {
				for(var index=0; index<count; index++) {
					var device = devices("objectAtIndex", index);
					var deviceTypeIdentifier = device("deviceType")("identifier").toString();
					var runtimeVersion = device("runtime")("versionString").toString();
					this.availableDevices[deviceTypeIdentifier] = {
						device: device,
						deviceTypeIdentifier: deviceTypeIdentifier,
						runtimeVersion: runtimeVersion
					};
				}
			}
		}

		return this.availableDevices;
	}

	private getDeviceByIdentifier(deviceIdentifier: string): any {
		var fullDeviceIdentifier = util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceIdentifier);
		var availableDevices = this.getAvailableDevices();
		if(!_.isEmpty(availableDevices)) {
			var selectedDevice = availableDevices[fullDeviceIdentifier];
			if(selectedDevice) {
				return selectedDevice.device;
			}
		}

		errors.fail("Unable to find device with identifier ", deviceIdentifier);
	}
}