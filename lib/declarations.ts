///<reference path="./.d.ts"/>
"use strict";

interface IiPhoneSimulator {
	run(appName: string): IFuture<void>;
	printDeviceTypes(): IFuture<void>;
	printSDKS(): IFuture<void>;
	sendNotification(notification: string): IFuture<void>;
}

interface ICommand {
	execute(args: string[]): IFuture<void>;
}

interface ICommandExecutor {
	execute(): IFuture<void>;
}

interface IDevice {
	device: any; // nodobjc wrapper to device
	deviceIdentifier: string;
	fullDeviceIdentifier: string;
	runtimeVersion: string;
}

interface IDictionary<T> {
	[key: string]: T;
}

interface ISimulator {
	validDeviceIdentifiers: string[];
	deviceIdentifiersInfo: string[];
	setSimulatedDevice(config: any): void;
}

interface IExecuteOptions {
	canRunMainLoop: boolean;
	appPath?: string;
}

interface ISdk {
	displayName: string;
	version: string;
	rootPath: string;
	sdkInfo(): string;
}