///<reference path="./.d.ts"/>
"use strict";

interface IiPhoneSimulator {
	run(applicationPath: string, applicationIdentifier: string): IFuture<void>;
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
	name: string;
	id: string;
	fullId: string;
	runtimeVersion: string;
	state?: string;
	rawDevice?: any; // NodObjC wrapper to device
}

interface ISimctl {
	launch(deviceId: string, applicationIdentifier: string): IFuture<void>;
	install(deviceId: string, applicationPath: string): IFuture<void>;
	uninstall(deviceId: string, applicationIdentifier: string): IFuture<void>;
	notifyPost(deviceId: string, notification: string): IFuture<void>;
	getDevices(): IFuture<IDevice[]>;
}

interface IDictionary<T> {
	[key: string]: T;
}

interface IInteropSimulator {
	getDevices(): IFuture<IDevice[]>;
	setSimulatedDevice(config: any): void;
}

interface ISimulator {
	getDevices(): IFuture<IDevice[]>;
	getSdks(): IFuture<ISdk[]>;
	run(applicationPath: string, applicationIdentifier: string): IFuture<void>;
	sendNotification(notification: string): IFuture<void>;
}

interface IExecuteOptions {
	canRunMainLoop: boolean;
	appPath?: string;
}

interface ISdk {
	displayName: string;
	version: string;
	rootPath: string;
}

interface IXcodeVersionData {
	major: string;
	minor: string;
	build: string;
}