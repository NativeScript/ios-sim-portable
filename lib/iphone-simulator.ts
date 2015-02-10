///<reference path="./.d.ts"/>
"use strict";

import child_process = require("child_process");
import fs = require("fs");
import Future = require("fibers/future");
import os = require("os");
import path = require("path");
import util = require("util");

import errors = require("./errors");
import options = require("./options");
import utils = require("./utils");
import xcode6SimulatorLib = require("./iphone-simulator-xcode-6");
import xcode5SimulatorLib = require("./iphone-simulator-xcode-5");

var $ = require("NodObjC");

export class iPhoneSimulator implements IiPhoneSimulator {

	private static FOUNDATION_FRAMEWORK_NAME = "Foundation";
	private static APPKIT_FRAMEWORK_NAME = "AppKit";

	private static DVT_FOUNDATION_RELATIVE_PATH = "../SharedFrameworks/DVTFoundation.framework";
	private static DEV_TOOLS_FOUNDATION_RELATIVE_PATH = "../OtherFrameworks/DevToolsFoundation.framework";
	private static CORE_SIMULATOR_RELATIVE_PATH = "Library/PrivateFrameworks/CoreSimulator.framework";
	private static SIMULATOR_FRAMEWORK_RELATIVE_PATH_LEGACY = "Platforms/iPhoneSimulator.platform/Developer/Library/PrivateFrameworks/DVTiPhoneSimulatorRemoteClient.framework";
	private static SIMULATOR_FRAMEWORK_RELATIVE_PATH = "../SharedFrameworks/DVTiPhoneSimulatorRemoteClient.framework";

	private static DEFAULT_TIMEOUT_IN_SECONDS = 90;

	public run(appPath: string): IFuture<void> {
		if(!fs.existsSync(appPath)) {
			errors.fail("Path does not exist ", appPath);
		}

		return this.execute(this.launch, { canRunMainLoop: true, appPath: appPath});
	}

	public printDeviceTypes(): IFuture<void> {
		var action = () => {
			var simulator = this.createSimulator();
			_.each(simulator.validDeviceIdentifiers, (identifier: any) => console.log(identifier));
		}

		return this.execute(action, { canRunMainLoop: false });
	}

	public printSDKS(): IFuture<void> {
		var action = () => {
			var systemRootClass = this.getClassByName("DTiPhoneSimulatorSystemRoot");
			var roots = systemRootClass("knownRoots");
			var count = roots("count");

			var sdks: ISdk[] = [];
			for(var index=0; index < count; index++) {
				var root = roots("objectAtIndex", index);

				var displayName = root("sdkDisplayName").toString();
				var version = root("sdkVersion").toString();
				var rootPath = root("sdkRootPath").toString();

				sdks.push(new Sdk(displayName, version, rootPath));
			}

			sdks = _.sortBy(sdks, (sdk: ISdk) => sdk.version);
			_.each(sdks, (sdk: ISdk) => console.log(sdk.sdkInfo() + os.EOL));
		};

		return this.execute(action, { canRunMainLoop: false });
	}

	private execute(action: (appPath?: string) => any, opts: IExecuteOptions): IFuture<void> {
		return (() => {
			$.importFramework(iPhoneSimulator.FOUNDATION_FRAMEWORK_NAME);
			$.importFramework(iPhoneSimulator.APPKIT_FRAMEWORK_NAME);

			var pool = $.NSAutoreleasePool("alloc")("init");

			var developerDirectoryPath = this.findDeveloperDirectory().wait();
			if(!developerDirectoryPath) {
				errors.fail("Unable to find developer directory");
			}

			this.loadFrameworks(developerDirectoryPath);

			action.apply(this, [opts.appPath]);

			if(opts.canRunMainLoop) {
				$.NSRunLoop("mainRunLoop")("run");
			}

			pool("release");
		}).future<void>()();
	}

	private launch(appPath: string): void {
		var sessionDelegate = $.NSObject.extend("DTiPhoneSimulatorSessionDelegate");
		sessionDelegate.addMethod("session:didEndWithError:", "v@:@@", function(self: any, sel: any, sess: any, error: any) {
			iPhoneSimulator.logSessionInfo(error, "Session ended without errors.", "Session ended with error ");
			process.exit(0);
		});
		sessionDelegate.addMethod("session:didStart:withError:", "v@:@c@", function(self: any, sel: string, session: any, started: boolean, error:any) {
			iPhoneSimulator.logSessionInfo(error, "Session started without errors.", "Session started with error ");
			if(options.exit) {
				process.exit(0);
			}
		});
		sessionDelegate.register();

		var appSpec = this.getClassByName("DTiPhoneSimulatorApplicationSpecifier")("specifierWithApplicationPath", $(appPath));
		var config = this.getClassByName("DTiPhoneSimulatorSessionConfig")("alloc")("init")("autorelease");
		config("setApplicationToSimulateOnStart",  appSpec);

		var sdkRoot = options.sdkRoot ? $(options.sdkRoot) : this.getClassByName("DTiPhoneSimulatorSystemRoot")("defaultRoot");
		config("setSimulatedSystemRoot", sdkRoot);

		var simulator = this.createSimulator(config);
		if(options.device) {
			var validDeviceIdentifiers = simulator.validDeviceIdentifiers;
			if(!_.contains(validDeviceIdentifiers, options.device)) {
				errors.fail("Invalid device identifier %s. Valid device identifiers are %s.", options.device, utils.stringify(validDeviceIdentifiers));
			}
		}
		simulator.setSimulatedDevice(config);

		if(options.stderr) {
			config("setSimulatedApplicationStdErrPath", $(options.stderr));
		}

		if(options.stdout) {
			config("setSimulatedApplicationStdOutPath", $(options.stdout));
		}

		config("setLocalizedClientName", $("ios-sim-portable"));

		var sessionError: any = new Buffer("");
		var timeoutParam = iPhoneSimulator.DEFAULT_TIMEOUT_IN_SECONDS;
		if (options.timeout || options.timeout === 0) {
			var parsedValue = parseInt(options.timeout);
			if(!isNaN(parsedValue) && parsedValue > 0) {
				timeoutParam = parsedValue;
			}
			else {
				console.log(util.format("Specify the timeout in number of seconds to wait. It should be greater than 0. Default value %s seconds will be used.", iPhoneSimulator.DEFAULT_TIMEOUT_IN_SECONDS.toString()));
			}
		}

		var time = $.NSNumber("numberWithDouble", timeoutParam);
		var timeout = time("doubleValue");

		var session = this.getClassByName("DTiPhoneSimulatorSession")("alloc")("init")("autorelease");
		var delegate = sessionDelegate("alloc")("init");
		session("setDelegate", delegate);

		if(!session("requestStartWithConfig", config, "timeout", timeout, "error", sessionError)) {
			errors.fail("Could not start simulator session ", sessionError);
		}
	}

	private loadFrameworks(developerDirectoryPath: string): void {
		this.loadFramework(path.join(developerDirectoryPath, iPhoneSimulator.DVT_FOUNDATION_RELATIVE_PATH));
		this.loadFramework(path.join(developerDirectoryPath, iPhoneSimulator.DEV_TOOLS_FOUNDATION_RELATIVE_PATH));

		if(fs.existsSync(path.join(developerDirectoryPath, iPhoneSimulator.CORE_SIMULATOR_RELATIVE_PATH))) {
			this.loadFramework(path.join(developerDirectoryPath, iPhoneSimulator.CORE_SIMULATOR_RELATIVE_PATH));
		}

		var platformsError: string = null;
		var dvtPlatformClass = this.getClassByName("DVTPlatform");
		if(!dvtPlatformClass("loadAllPlatformsReturningError", platformsError)) {
			errors.fail("Unable to loadAllPlatformsReturningError ", platformsError);
		}

		var simulatorFrameworkPath = path.join(developerDirectoryPath, iPhoneSimulator.SIMULATOR_FRAMEWORK_RELATIVE_PATH_LEGACY);
		if(!fs.existsSync(simulatorFrameworkPath)) {
			simulatorFrameworkPath = path.join(developerDirectoryPath, iPhoneSimulator.SIMULATOR_FRAMEWORK_RELATIVE_PATH);
		}
		this.loadFramework(simulatorFrameworkPath);
	}

	private loadFramework(frameworkPath: string) {
		var bundle =  $.NSBundle("bundleWithPath", $(frameworkPath));
		if(!bundle("load")) {
			errors.fail("Unable to load ", frameworkPath);
		}
	}

	private findDeveloperDirectory(): IFuture<string> {
		var future = new Future<string>();
		var capturedOut = "";
		var capturedErr = "";

		var childProcess = child_process.spawn("xcode-select", ["-print-path"]);

		if(childProcess.stdout) {
			childProcess.stdout.on("data", (data: string) => {
				capturedOut +=  data;
			});
		}

		if(childProcess.stderr) {
			childProcess.stderr.on("data", (data: string) => {
				capturedErr += data;
			});
		}

		childProcess.on("close", (arg: any) => {
			var exitCode = typeof arg == 'number' ? arg : arg && arg.code;
			if(exitCode === 0) {
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

	private createSimulator(config?: any): ISimulator {
		if(!config) {
			config = this.getClassByName("DTiPhoneSimulatorSessionConfig")("alloc")("init")("autorelease");
		}

		var simulator: ISimulator;
		if(_.contains(config.methods(), "setDevice:")) {
			simulator = new xcode6SimulatorLib.XCode6Simulator();
		} else {
			simulator = new xcode5SimulatorLib.XCode5Simulator();
		}

		return simulator;
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