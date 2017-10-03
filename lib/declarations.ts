///<reference path="./.d.ts"/>
"use strict";

interface IiPhoneSimulator {
	run(applicationPath: string, applicationIdentifier: string): void;
	printDeviceTypes(): void;
	printSDKS(): void;
	sendNotification(notification: string): void;
	createSimulator(): ISimulator;
}

interface ICommand {
	execute(args: string[]): void;
}

interface ICommandExecutor {
	execute(): void;
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
	launch(deviceId: string, applicationIdentifier: string): string;
	terminate(deviceId: string, appIdentifier: string): string;
	install(deviceId: string, applicationPath: string): void;
	uninstall(deviceId: string, applicationIdentifier: string, opts?: any): void;
	notifyPost(deviceId: string, notification: string): void;
	getDevices(): IDevice[];
	getLog(deviceId: string): any;
	getAppContainer(deviceId: string, applicationIdentifier: string): string;
}

interface IDictionary<T> {
	[key: string]: T;
}

interface ISimulator extends INameGetter {
	getDevices(): IDevice[];
	getSdks(): ISdk[];
	run(applicationPath: string, applicationIdentifier: string): void;
	sendNotification(notification: string): void;
	getApplicationPath(deviceId: string, applicationIdentifier: string): string;
	getInstalledApplications(deviceId: string): IApplication[];
	installApplication(deviceId: string, applicationPath: string): void;
	uninstallApplication(deviceId: string, appIdentifier: string): void;
	startApplication(deviceId: string, appIdentifier: string): string;
	stopApplication(deviceId: string, appIdentifier: string, bundleExecutable: string): string;
	printDeviceLog(deviceId: string, launchResult?: string): any;
	getDeviceLogProcess(deviceId: string): any;
	startSimulator(): void;
}

interface INameGetter {
	getSimulatorName(deviceName?: string): string;
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
	rootPath?: string;
}

interface IXcodeVersionData {
	major: string;
	minor: string;
	build: string;
}
