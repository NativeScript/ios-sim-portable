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
	public defaultDeviceIdentifier: string;

	constructor() {
		super(this);
		this.defaultDeviceIdentifier = "iPhone"
	}

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

	public getApplicationPath(deviceId: string, applicationIdentifier: string): IFuture<string> {
		return Future.fromResult("");
	}

	public getInstalledApplications(deviceId: string): IFuture<IApplication[]> {
		return Future.fromResult(<IApplication[]>[]);
	}

	public installApplication(deviceId: string, applicationPath: string): IFuture<void> {
		return Future.fromResult();
	}

	public uninstallApplication(deviceId: string, appIdentifier: string): IFuture<void> {
		return Future.fromResult();
	}

	public startApplication(deviceId: string, appIdentifier: string): IFuture<string> {
		return Future.fromResult("");
	}

	public stopApplication(deviceId: string, appIdentifier: string): IFuture<string> {
		return Future.fromResult("");
	}

	public printDeviceLog(deviceId: string): void {	}

	public startSimulator(): IFuture<void> {
		return Future.fromResult();
	}

	private get deviceIdentifier(): string {
		return XCode5Simulator.allowedDeviceIdentifiers[this.getSimulatorName()];
	}
}