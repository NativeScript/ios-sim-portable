interface IDictionary<T> {
	[key: string]: T
}

interface IDeferPromise<T> {
	isRejected(): boolean;
	isPending(): boolean;
	getResult(): any;
	promise: Promise<T>;
	resolve(value?: T | PromiseLike<T>): void;
	reject(reason?: any): void;
	isResolved(): boolean;
}

interface IiPhoneSimulator {
	run(applicationPath: string, applicationIdentifier: string, options: IOptions): Promise<string>;
	printDeviceTypes(): Promise<void>;
	printSDKS(): Promise<void>;
	sendNotification(notification: string, deviceId: string): Promise<void>;
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

interface ISkipErrorComposition {
	skipError: boolean;
}

interface ISimctl {
	launch(deviceId: string, applicationIdentifier: string, options: IOptions): Promise<string>;
	boot(deviceId: string): Promise<void>;
	terminate(deviceId: string, appIdentifier: string): Promise<string>;
	install(deviceId: string, applicationPath: string): Promise<void>;
	uninstall(deviceId: string, applicationIdentifier: string, opts?: ISkipErrorComposition): Promise<void>;
	notifyPost(deviceId: string, notification: string): Promise<void>;
	getDevices(): Promise<IDevice[]>;
	getLog(deviceId: string, predicate?: string): any;
	getAppContainer(deviceId: string, applicationIdentifier: string): Promise<string>;
}

interface ISimulator extends INameGetter {
	getDevices(): Promise<IDevice[]>;
	getSdks(): Promise<ISdk[]>;
	run(applicationPath: string, applicationIdentifier: string, options: IOptions): Promise<string>;
	sendNotification(notification: string, deviceId: string): Promise<void>;
	getApplicationPath(deviceId: string, applicationIdentifier: string): Promise<string>;
	getInstalledApplications(deviceId: string): IApplication[];
	installApplication(deviceId: string, applicationPath: string): Promise<void>;
	uninstallApplication(deviceId: string, appIdentifier: string): Promise<void>;
	startApplication(deviceId: string, appIdentifier: string, options: IOptions): Promise<string>;
	stopApplication(deviceId: string, appIdentifier: string, bundleExecutable: string): Promise<void>;
	getDeviceLogProcess(deviceId: string): Promise<any>;
	startSimulator(options: IOptions, device?: IDevice): Promise<void>;
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

interface IOptions {
	skipInstall?: boolean;
	waitForDebugger?: boolean;
	args?: any;
	sdkVersion?: string;
	sdk?: string;
	device?: string;
}
