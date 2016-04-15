///<reference path="./.d.ts"/>
"use strict";

interface IiPhoneSimulator {
	run(applicationPath: string, applicationIdentifier: string): IFuture<void>;
	printDeviceTypes(): IFuture<void>;
	printSDKS(): IFuture<void>;
	sendNotification(notification: string): IFuture<void>;
	createSimulator(): IFuture<ISimulator>;
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
	launch(deviceId: string, applicationIdentifier: string): IFuture<string>;
	install(deviceId: string, applicationPath: string): IFuture<void>;
	uninstall(deviceId: string, applicationIdentifier: string, opts?: any): IFuture<void>;
	notifyPost(deviceId: string, notification: string): IFuture<void>;
	getDevices(): IFuture<IDevice[]>;
	getAppContainer(deviceId: string, applicationIdentifier: string): IFuture<string>;
}

interface IDictionary<T> {
	[key: string]: T;
}

interface IInteropSimulator extends INameGetter {
	getDevices(): IFuture<IDevice[]>;
	setSimulatedDevice(config: any): void;
}

interface ISimulator extends INameGetter {
	getDevices(): IFuture<IDevice[]>;
	getSdks(): IFuture<ISdk[]>;
	run(applicationPath: string, applicationIdentifier: string): IFuture<void>;
	sendNotification(notification: string): IFuture<void>;
	getApplicationPath(deviceId: string, applicationIdentifier: string): IFuture<string>;
	getInstalledApplications(deviceId: string): IFuture<IApplication[]>;
	installApplication(deviceId: string, applicationPath: string): IFuture<void>;
	uninstallApplication(deviceId: string, appIdentifier: string): IFuture<void>;
	startApplication(deviceId: string, appIdentifier: string): IFuture<string>;
	stopApplication(deviceId: string, appIdentifier: string): IFuture<string>;
	printDeviceLog(deviceId: string, launchResult?: string): void;
	startSimulator(): IFuture<void>;
}

interface INameGetter {
	getSimulatorName(deviceId: string): string;
}

interface IApplication {
	guid: string;
	appIdentifier: string;
	path: string;
}

interface IExecuteOptions {
	canRunMainLoop: boolean;
	appPath?: string;
	applicationIdentifier?: string;
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