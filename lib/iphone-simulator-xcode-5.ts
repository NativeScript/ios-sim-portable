///<reference path="./.d.ts"/>
"use strict";

import options = require("./options");
import util = require("util");


export class XCode5Simulator implements ISimulator {

	private static DEFAULT_DEVICE_IDENTIFIER = "Resizable-iPad";

	private static allowedDeviceIdentifiers = [
		"iPhone",
		"iPhone Retina (3.5-inch)",
		"iPhone Retina (4-inch)",
		"iPhone Retina (4-inch 64-bit)",
		"iPad",
		"iPad Retina",
		"iPad Retina (64-bit)"
	];

	public validateDeviceIdentifier(): void {
	}

	public setSimulatedDevice(config:any): void {
		config("setSimulatedDeviceInfoName", this.deviceIdentifier);
	}

	private get deviceIdentifier() {
		return options.devie || XCode5Simulator.DEFAULT_DEVICE_IDENTIFIER;
	}
}