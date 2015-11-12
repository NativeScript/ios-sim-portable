///<reference path="./.d.ts"/>
"use strict";
import * as errors from "./errors";
import * as options from "./options";
import * as utils from "./utils";
import * as fs from "fs";
import Future = require("fibers/future");
import * as path from "path";
import * as util from "util";
import * as os from "os";
let $ = require("nodobjc");
let bplistParser = require("bplist-parser");
let osenv = require("osenv");

import iPhoneSimulatorBaseLib = require("./iphone-interop-simulator-base");

export class XCode6Simulator extends iPhoneSimulatorBaseLib.IPhoneInteropSimulatorBase implements IInteropSimulator {

	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
	private static DEFAULT_DEVICE_IDENTIFIER = "iPhone-4s";

	private cachedDevices: IDevice[];

	constructor() {
		super(this);

		this.cachedDevices = null;
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
			let rootApplicationsPath = path.join(osenv.home(), `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Containers/Bundle/Application`);
			if(!fs.existsSync(rootApplicationsPath)) {
				rootApplicationsPath = path.join(osenv.home(), `/Library/Developer/CoreSimulator/Devices/${deviceId}/data/Applications`);
			}
			let applicationGuids = fs.readdirSync(rootApplicationsPath);
			let result: string = null;
			_.each(applicationGuids, applicationGuid => {
				let fullApplicationPath = path.join(rootApplicationsPath, applicationGuid);
				let applicationDirContents = fs.readdirSync(fullApplicationPath);
				let applicationName = _.find(applicationDirContents, fileName => path.extname(fileName) === ".app");
				let plistFilePath = path.join(fullApplicationPath, applicationName, "Info.plist");
				let applicationData = this.parseFile(plistFilePath).wait();
				if(applicationData[0].CFBundleIdentifier === applicationIdentifier) {
					result = path.join(fullApplicationPath, applicationName);
					return false;
				}
			});

			return result;
		}).future<string>()();
	}

	private parseFile(plistFilePath: string): IFuture<any> {
		let future = new Future<any>();
		bplistParser.parseFile(plistFilePath, (err: Error, obj: any) => {
			if(err) {
				future.throw(err);
			} else {
				future.return(obj);
			}
		});
		return future;
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

	private get deviceName(): string {
		return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
	}

	private getDeviceByName(): IDevice {
		let devices = this.getDevices().wait();
		let device = _.find(devices, (device) => device.name === this.deviceName);
		if(!device) {
			errors.fail("Unable to find device with name ", this.deviceName);
		}

		return device;
	}

	private buildFullDeviceIdentifier(deviceIdentifier: string): string {
		return util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceIdentifier);
	}
}