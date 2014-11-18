///<reference path="./.d.ts"/>
"use strict";

import errors = require("./errors");
import options = require("./options");
import utils = require("./utils");
import util = require("util");

var $ = require("NodObjC");

export class XCode5Simulator implements ISimulator {

	private static DEFAULT_DEVICE_IDENTIFIER = "iPhone";

	private static allowedDeviceIdentifiers: IDictionary<string> = {
		"iPhone": "iPhone",
		"iPhone-Retina-3.5-inch": "iPhone Retina (3.5-inch)",
		"iPhone-Retina-4-inch": "iPhone Retina (4-inch)",
		"iPhone-Retina-4-inch-64-bit": "iPhone Retina (4-inch 64-bit)",
		"iPad": "iPad",
		"iPad-Retina": "iPad Retina",
		"iPad-Retina-64-bit": "iPad Retina (64-bit)"
	}

	public get validDeviceIdentifiers(): string[] {
		return _.keys(XCode5Simulator.allowedDeviceIdentifiers);
	}

	public setSimulatedDevice(config:any): void {
		config("setSimulatedDeviceInfoName", $(this.deviceIdentifier));
	}

	private get deviceIdentifier(): string {
		var identifier = options.device || XCode5Simulator.DEFAULT_DEVICE_IDENTIFIER;
		return XCode5Simulator.allowedDeviceIdentifiers[identifier];
	}
}