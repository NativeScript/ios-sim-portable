///<reference path="./.d.ts"/>
"use strict";

interface IiPhoneSimulator {
	run(appName: string): IFuture<void>;
}

interface ICommand {
	execute(args: string[]): IFuture<void>;
}

interface ICommandExecutor {
	execute(): IFuture<void>;
}

interface IDevice {
	device: any; // NodObjC wrapper to device
	deviceTypeIdentifier: string;
	runtimeVersion: string;
}

interface IDictionary<T> {
	[key: string]: T;
}

interface ISimulator {
	validateDeviceIdentifier(): void;
	setSimulatedDevice(config: any): void;
}