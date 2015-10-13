///<reference path="./.d.ts"/>
"use strict";
import errors = require("./errors");
import options = require("./options");
import utils = require("./utils");
import util = require("util");
import os = require("os");
import child_process = require("child_process");
import Future = require("fibers/future");
var $ = require("NodObjC");

export class XCode6Simulator implements ISimulator {

	private static DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
	private static DEFAULT_DEVICE_IDENTIFIER = "iPhone-4s";

	private devices: IDevice[];

	constructor() {
		this.devices = this.getAvailableDevices().wait();
	}

	public get validDeviceIdentifiers(): string[] {
		return _.map(this.devices, device => device.deviceIdentifier);
	}

	public get deviceIdentifiersInfo(): string[] {
		return _.map(this.devices, device => util.format("Device Identifier: %s. %sRuntime Version: %s %s", device.fullDeviceIdentifier, os.EOL, device.runtimeVersion, os.EOL));
	}

	public setSimulatedDevice(config: any): void { }

	public getSimulatedDevice(): any {
		return this.getDeviceByIdentifier(this.deviceIdentifier);
	}

	private get deviceIdentifier(): string {
		return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
	}

	private getDeviceByIdentifier(deviceIdentifier: string): any {
		var device = _.find(this.devices, (dev: IDevice) => dev.deviceIdentifier === deviceIdentifier);
		if(!device) {
			errors.fail("Unable to find device with identifier ", deviceIdentifier);
		}

		return device;
	}

	private buildFullDeviceIdentifier(deviceName: string): string {
		return util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceName);
	}

	private simctlExec(command: string, args: string[]): IFuture<any> {
		args = ["xcrun", "simctl", command, ...args];
		console.log(util.format("Executing: xcrun with args: %s", args.join(' ')));

		var future = new Future<any>();

		child_process.exec(args.join(" "), (error: Error, stdout: NodeBuffer, stderr: NodeBuffer) => {
			if(error) {
				errors.fail(error.message);
			} else if(stderr) {
				errors.fail("simctl error: %s", stderr.toString());
			} else {
				future.return(stdout.toString());
			}
		});

		return future;
	}

	private launch(udid: string, bundleId: string): IFuture<void> {
		return this.simctlExec('launch', [udid, bundleId]);
	}

	private getAvailableDevices(): IFuture<IDevice[]> {
		return (() => {
			var rowDevices = this.simctlExec("list", ["devices"]).wait();

			console.log("ROW DEVICESS!!!");
			console.log(rowDevices);

			// expect to get a listing like
			// -- iOS 8.1 --
			//     iPhone 4s (3CA6E7DD-220E-45E5-B716-1E992B3A429C) (Shutdown)
			//     ...
			// -- iOS 8.2 --
			//     iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
			//     ...
			// so, get the `-- iOS X.X --` line to find the sdk (X.X)
			// and the rest of the listing in order to later find the devices

			let deviceSectionReg = /-- (iOS|watchOS) (.+) --(\n    .+)*/mg;
			let matches: any[] = [];
			let match = deviceSectionReg.exec(rowDevices);

			// make an entry for each sdk version
			while (match !== null) {
				matches.push(match);
				match = deviceSectionReg.exec(rowDevices);
			}
			if (matches.length < 1) {
				throw new Error('Could not find device section. ' + match);
			}

			// get all the devices for each sdk
			let devices: IDevice[] = [];
			for (match of matches) {
				let sdk:string = match[2];
				// split the full match into lines and remove the first
				for (let line of match[0].split('\n').slice(1)) {
					// a line is something like
					//    iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
					// retrieve:
					//   iPhone 4s
					//   A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E
					//   Shutdown
					let lineReg = /^    ([^\(]+) \(([^\)]+)\) \(([^\)]+)\)( \(([^\)]+)\))*/;
					let lineMatch = lineReg.exec(line);
					if (lineMatch === null) {
						throw new Error('Could not match line. ' + line);
					}

					let available = lineMatch[4];
					if(available) {
						// save the whole thing as ab object in the list for this sdk
						devices.push({
							name: lineMatch[1],
							deviceIdentifier: lineMatch[2],
							fullDeviceIdentifier: this.buildFullDeviceIdentifier(lineMatch[1]),
							state: lineMatch[3],
							runtimeVersion: sdk,
						});

					}
				}
			}

			return devices;

		}).future<IDevice[]>()();
	}
}