///<reference path="./.d.ts"/>
"use strict";
import errors = require("./errors");
import options = require("./options");
import utils = require("./utils");
import util = require("util");
var $ = require("NodObjC");

export class XCode6Simulator implements ISimulator {

	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
	private static DEFAULT_DEVICE_IDENTIFIER = "Resizable-iPad";

	private static allowedDeviceIdentifiers = [
		"iPhone-4s",
		"iPhone-5",
		"iPhone-5s",
		"iPhone-6",
		"iPhone-6-Plus",
		"Resizable-iPhone",
		"iPad-2",
		"iPad-Retina",
		"iPad-Air",
		"Resizable-iPad"
	];

	private availableDevices: IDictionary<IDevice>;

	constructor() {
		this.availableDevices = Object.create(null);
	}

	public get validDeviceIdentifiers(): string[] {
		return XCode6Simulator.allowedDeviceIdentifiers;
	}

	public setSimulatedDevice(config: any): void {
		var device = this.getDeviceByIdentifier(this.deviceIdentifier);
		config("setDevice", device);
	}

	private get deviceIdentifier(): string {
		return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
	}

	private getAvailableDevices(): IDictionary<IDevice> {
		if(utils.isEmptyDictionary(this.availableDevices)) {
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
		if(!utils.isEmptyDictionary(availableDevices)) {
			var device = availableDevices[fullDeviceIdentifier];
			if(device) {
				return device.device;
			}
		}

		errors.fail("Unable to find device with identifier ", deviceIdentifier);
	}
}