///<reference path="./.d.ts"/>
"use strict";

import errors = require("./errors");
import Future = require("fibers/future");
import options = require("./options");
import utils = require("./utils");
import util = require("util");

var $ = require("nodobjc");

import iPhoneSimulatorBaseLib = require("./iphone-interop-simulator-base");

export class XCode5Simulator extends iPhoneSimulatorBaseLib.IPhoneInteropSimulatorBase implements IInteropSimulator {

	constructor() {
		super(this);
	}

	private static DEFAULT_DEVICE_IDENTIFIER = "iPhone";

	private static allowedDeviceIdentifiers: IDictionary<string> = {
		"iPhone": "iPhone",
		"iPhone-Retina-3.5-inch": "iPhone Retina (3.5-inch)",
		"iPhone-Retina-4-inch": "iPhone Retina (4-inch)",
		"iPhone-Retina-4-inch-64-bit": "iPhone Retina (4-inch 64-bit)",
		"iPad": "iPad",
		"iPad-Retina": "iPad Retina",
		"iPad-Retina-64-bit": "iPad Retina (64-bit)"
	};

	public getDevices(): IFuture<IDevice[]> {
		return (() => {
			let devices: IDevice[] = [];
			_.each(_.keys(XCode5Simulator.allowedDeviceIdentifiers), deviceName => {
				devices.push({
					name: deviceName,
					id: deviceName,
					fullId: deviceName,
					runtimeVersion: ""
				});
			});

			return devices;
		}).future<IDevice[]>()();
	}

	public getSdks(): IFuture<ISdk[]> {
		return (() => {
			return (<ISdk[]>[]);
		}).future<ISdk[]>()();
	}

	public setSimulatedDevice(config:any): void {
		config("setSimulatedDeviceInfoName", $(this.deviceIdentifier));
	}

	public sendNotification(notification: string): IFuture<void> {
		return Future.fromResult();
	}

	private get deviceIdentifier(): string {
		let identifier = options.device || XCode5Simulator.DEFAULT_DEVICE_IDENTIFIER;
		return XCode5Simulator.allowedDeviceIdentifiers[identifier];
	}
}