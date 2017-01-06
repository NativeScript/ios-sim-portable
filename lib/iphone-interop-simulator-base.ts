///<reference path="./.d.ts"/>
"use strict";

import * as child_process from "child_process";
import * as errors from "./errors";
import * as fs from "fs";
import Future = require("fibers/future");
import * as options from "./options";
import * as os from "os";
import * as path from "path";
import * as util from "util";
import * as utils from "./utils";
import * as _ from "lodash";

let $ = require("nodobjc");
import {IPhoneSimulatorNameGetter} from "./iphone-simulator-name-getter";

export abstract class IPhoneInteropSimulatorBase extends IPhoneSimulatorNameGetter {
	constructor() {
		super();
	}

	private static FOUNDATION_FRAMEWORK_NAME = "Foundation";
	private static APPKIT_FRAMEWORK_NAME = "AppKit";

	private static DVT_FOUNDATION_RELATIVE_PATH = "../SharedFrameworks/DVTFoundation.framework";
	private static DEV_TOOLS_FOUNDATION_RELATIVE_PATH = "../OtherFrameworks/DevToolsFoundation.framework";
	private static CORE_SIMULATOR_RELATIVE_PATH = "Library/PrivateFrameworks/CoreSimulator.framework";
	private static SIMULATOR_FRAMEWORK_RELATIVE_PATH_LEGACY = "Platforms/iPhoneSimulator.platform/Developer/Library/PrivateFrameworks/DVTiPhoneSimulatorRemoteClient.framework";
	private static SIMULATOR_FRAMEWORK_RELATIVE_PATH = "../SharedFrameworks/DVTiPhoneSimulatorRemoteClient.framework";

	private static DEFAULT_TIMEOUT_IN_SECONDS = 90;

	public abstract getDevices(): IFuture<IDevice[]>;
	public abstract setSimulatedDevice(config: any): void;

	public run(appPath: string, applicationIdentifier: string): IFuture<void> {
		return this.execute(this.launch, { canRunMainLoop: true, appPath: appPath, applicationIdentifier: applicationIdentifier });
	}

	private setupSessionDelegate(appPath: string, applicationIdentifier: string): any {
		let sessionDelegate = $.NSObject.extend("DTiPhoneSimulatorSessionDelegate");
		sessionDelegate.addMethod("session:didEndWithError:", "v@:@@", function(self: any, sel: any, sess: any, error: any) {
			IPhoneInteropSimulatorBase.logSessionInfo(error, "Session ended without errors.", "Session ended with error ");
			process.exit(0);
		});
		sessionDelegate.addMethod("session:didStart:withError:", "v@:@c@", function(self: any, sel: string, session: any, started: boolean, error:any) {
			IPhoneInteropSimulatorBase.logSessionInfo(error, "Session started without errors.", "Session started with error ");

			console.log(`${applicationIdentifier}: ${session("simulatedApplicationPID")}`);
			if (options.exit) {
				process.exit(0);
			}
		});
		sessionDelegate.register();

		return sessionDelegate;
	}

	private getTimeout(): number {
		let timeoutParam = IPhoneInteropSimulatorBase.DEFAULT_TIMEOUT_IN_SECONDS;
		if (options.timeout || options.timeout === 0) {
			let parsedValue = parseInt(options.timeout);
			if(!isNaN(parsedValue) && parsedValue > 0) {
				timeoutParam = parsedValue;
			}
			else {
				console.log(`Specify the timeout in number of seconds to wait. It should be greater than 0. Default value ${IPhoneInteropSimulatorBase.DEFAULT_TIMEOUT_IN_SECONDS} seconds will be used.`);
			}
		}
		return timeoutParam;
	}

	private validateDevice() {
		if (options.device) {
			let devices = this.getDevices().wait();
			let validDeviceIdentifiers = _.map(devices, device => device.id);
			if(!_.contains(validDeviceIdentifiers, options.device)) {
				errors.fail("Invalid device identifier %s. Valid device identifiers are %s.", options.device, utils.stringify(validDeviceIdentifiers));
			}
		}
	}

	private launch(appPath: string, applicationIdentifier: string): void {
		let sessionDelegate = this.setupSessionDelegate(appPath, applicationIdentifier);

		let appSpec = this.getClassByName("DTiPhoneSimulatorApplicationSpecifier")("specifierWithApplicationPath", $(appPath));
		let config = this.getClassByName("DTiPhoneSimulatorSessionConfig")("alloc")("init")("autorelease");
		config("setApplicationToSimulateOnStart",  appSpec);
		config("setSimulatedApplicationShouldWaitForDebugger", options.waitForDebugger);

		let sdkVersion = options.sdkVersion || options.sdk;
		let sdkRoot = sdkVersion ? $(this.getSdkRootPathByVersion(sdkVersion)) : this.getClassByName("DTiPhoneSimulatorSystemRoot")("defaultRoot");
		config("setSimulatedSystemRoot", sdkRoot);

		this.validateDevice();
		this.setSimulatedDevice(config);

		if (options.logging) {
			let logPath = this.createLogPipe(appPath).wait();
			fs.createReadStream(logPath, { encoding: "utf8" }).pipe(process.stdout);
			config("setSimulatedApplicationStdErrPath", $(logPath));
			config("setSimulatedApplicationStdOutPath", $(logPath));
		} else {
			if (options.stderr) {
				config("setSimulatedApplicationStdErrPath", $(options.stderr));
			}
			if (options.stdout) {
				config("setSimulatedApplicationStdOutPath", $(options.stdout));
			}
		}

		if (options.args) {
			let args = options.args.trim().split(/\s+/);
			let nsArgs = $.NSMutableArray("array");
			args.forEach((x: string) => nsArgs("addObject", $(x)));
			config("setSimulatedApplicationLaunchArgs", nsArgs);
		}

		config("setLocalizedClientName", $("ios-sim-portable"));

		let sessionError: any = new Buffer("");
		let timeoutParam = this.getTimeout();

		let time = $.NSNumber("numberWithDouble", timeoutParam);
		let timeout = time("doubleValue");

		let session = this.getClassByName("DTiPhoneSimulatorSession")("alloc")("init")("autorelease");
		let delegate = sessionDelegate("alloc")("init");
		session("setDelegate", delegate);

		if (!session("requestStartWithConfig", config, "timeout", timeout, "error", sessionError)) {
			errors.fail("Could not start simulator session ", sessionError);
		}
	}

	protected execute(action: (appPath?: string, applicationIdentifier?: string) => any, opts: IExecuteOptions): IFuture<any> {
		$.importFramework(IPhoneInteropSimulatorBase.FOUNDATION_FRAMEWORK_NAME);
		$.importFramework(IPhoneInteropSimulatorBase.APPKIT_FRAMEWORK_NAME);

		let developerDirectoryPath = this.findDeveloperDirectory().wait();
		if(!developerDirectoryPath) {
			errors.fail("Unable to find developer directory");
		}

		this.loadFrameworks(developerDirectoryPath);

		let result = action.apply(this, [opts.appPath, opts.applicationIdentifier]);
		return this.runCFLoop(opts.canRunMainLoop, result);
	}

	private runCFLoop(canRunMainLoop: boolean, result: any): IFuture<any> {
		let pool = $.NSAutoreleasePool("alloc")("init");
		let future = new Future<any>();

		if (canRunMainLoop) {
			// Keeps the Node loop running
			(function runLoop() {
				if($.CFRunLoopRunInMode($.kCFRunLoopDefaultMode, 0.1, false)) {
					setTimeout(runLoop, 0);
				} else {
					pool("release");
					future.return(result);
				}
			}());
		} else {
			future.return(result);
		}

		return future;
	}

	private loadFrameworks(developerDirectoryPath: string): void {
		this.loadFramework(path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.DVT_FOUNDATION_RELATIVE_PATH));
		this.loadFramework(path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.DEV_TOOLS_FOUNDATION_RELATIVE_PATH));

		if(fs.existsSync(path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.CORE_SIMULATOR_RELATIVE_PATH))) {
			this.loadFramework(path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.CORE_SIMULATOR_RELATIVE_PATH));
		}

		let platformsError: string = null;
		let dvtPlatformClass = this.getClassByName("DVTPlatform");
		if(!dvtPlatformClass("loadAllPlatformsReturningError", platformsError)) {
			errors.fail("Unable to loadAllPlatformsReturningError ", platformsError);
		}

		let simulatorFrameworkPath = path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.SIMULATOR_FRAMEWORK_RELATIVE_PATH_LEGACY);
		if(!fs.existsSync(simulatorFrameworkPath)) {
			simulatorFrameworkPath = path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.SIMULATOR_FRAMEWORK_RELATIVE_PATH);
		}
		this.loadFramework(simulatorFrameworkPath);
	}

	private loadFramework(frameworkPath: string) {
		let bundle = $.NSBundle("bundleWithPath", $(frameworkPath));
		if(!bundle("load")) {
			errors.fail("Unable to load ", frameworkPath);
		}
	}

	private findDeveloperDirectory(): IFuture<string> {
		let future = new Future<string>();
		let capturedOut = "";
		let capturedErr = "";

		let childProcess = child_process.spawn("xcode-select", ["-print-path"]);

		if (childProcess.stdout) {
			childProcess.stdout.on("data", (data: string) => {
				capturedOut +=  data;
			});
		}

		if (childProcess.stderr) {
			childProcess.stderr.on("data", (data: string) => {
				capturedErr += data;
			});
		}

		childProcess.on("close", (arg: any) => {
			let exitCode = typeof arg == 'number' ? arg : arg && arg.code;
			if (exitCode === 0) {
				future.return(capturedOut ? capturedOut.trim() : null);
			} else {
				future.throw(util.format("Command xcode-select -print-path failed with exit code %s. Error output: \n %s", exitCode, capturedErr));
			}
		});

		return future;
	}

	private getClassByName(className: string): any {
		return $.classDefinition.getClassByName(className);
	}

	private static logSessionInfo(error: any, successfulMessage: string, errorMessage: string): void {
		if(error) {
			console.log(util.format("%s %s", errorMessage, error));
			process.exit(1);
		}

		console.log(successfulMessage);
	}

	private getSdkRootPathByVersion(version: string): string {
		let sdks = this.getInstalledSdks();
		let sdk = _.find(sdks, sdk => sdk.version === version);
		if (!sdk) {
			errors.fail("Unable to find installed sdk with version %s. Verify that you have specified correct version and the sdk with that version is installed.", version);
		}

		return sdk.rootPath;
	}

	private getInstalledSdks(): ISdk[] {
		let systemRootClass = this.getClassByName("DTiPhoneSimulatorSystemRoot");
		let roots = systemRootClass("knownRoots");
		let count = roots("count");

		let sdks: ISdk[] = [];
		for (let index=0; index < count; index++) {
			let root = roots("objectAtIndex", index);

			let displayName = root("sdkDisplayName").toString();
			let version = root("sdkVersion").toString();
			let rootPath = root("sdkRootPath").toString();

			sdks.push(new Sdk(displayName, version, rootPath));
		}

		return sdks;
	}

	private createLogPipe(appPath: string): IFuture<string> {
		let future = new Future<string>();
		let logPath = path.join(path.dirname(appPath), "." + path.basename(appPath, ".app") + ".log");

		let command = util.format("rm -f \"%s\" && mkfifo \"%s\"", logPath, logPath);
		child_process.exec(command, (error: Error, stdout: NodeBuffer, stderr: NodeBuffer) => {
			if(error) {
				future.throw(error);
			} else {
				future.return(logPath);
			}
		});

		return future;
	}
}

class Sdk implements ISdk {
	constructor(public displayName: string,
		public version: string,
		public rootPath: string) { }

	public sdkInfo(): string {
		return [util.format("    Display Name: %s", this.displayName),
			util.format("    Version: %s", this.version),
			util.format("    Root path: %s", this.rootPath)].join(os.EOL);
	}
}
