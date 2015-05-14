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


	private availableDevices: IDictionary<IDevice[]>;

	constructor() {
		this.availableDevices = Object.create(null);
	}

	public get validDeviceIdentifiers(): string[] {
		var devices = this.getDevicesInfo();
		return _.map(devices, device => device.deviceIdentifier);
	}

	public get deviceIdentifiersInfo(): string[] {
		var devices = this.getDevicesInfo();
		return _.map(devices, device => util.format("Device Identifier: %s. %sRuntime Version: %s %s", device.fullDeviceIdentifier, os.EOL, device.runtimeVersion, os.EOL));
	}

	public setSimulatedDevice(config: any): void {
		var device = this.getDeviceByIdentifier(this.deviceIdentifier);
		config("setDevice", device);
	}

	public getSimulatedDevice(): any {
		return this.getDeviceByIdentifier(this.deviceIdentifier);
	}

	private getDevicesInfo(): IDevice[] {
		return <IDevice[]> _(this.getAvailableDevices())
			.map(_.identity)
			.flatten()
			.value();
	}

	private get deviceIdentifier(): string {
		return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
	}

	private getAvailableDevices(): IDictionary<IDevice[]> {
		if(_.isEmpty(this.availableDevices)) {
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

					if(!this.availableDevices[deviceIdentifier]) {
						this.availableDevices[deviceIdentifier] = [];
					}

					this.availableDevices[deviceIdentifier].push({
						device: device,
						deviceIdentifier: deviceIdentifierWithoutPrefix,
						fullDeviceIdentifier: this.buildFullDeviceIdentifier(deviceIdentifier),
						runtimeVersion: runtimeVersion
					});
				}
			}
		}

		return this.availableDevices;
	}

	private getDeviceByIdentifier(deviceIdentifier: string): any {
		var availableDevices = this.getAvailableDevices();
		if(!_.isEmpty(availableDevices)) {
			var fullDeviceIdentifier = this.buildFullDeviceIdentifier(deviceIdentifier);
			var selectedDevice = availableDevices[fullDeviceIdentifier];
			if(selectedDevice) {
				return selectedDevice[0].device;
			}
		}

		errors.fail("Unable to find device with identifier ", deviceIdentifier);
	}

	private buildFullDeviceIdentifier(deviceIdentifier: string): string {
		return util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceIdentifier);
	}
}