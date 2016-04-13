///<reference path="./.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var child_process = require("child_process");
var errors = require("./errors");
var fs = require("fs");
var Future = require("fibers/future");
var options = require("./options");
var os = require("os");
var path = require("path");
var util = require("util");
var utils = require("./utils");
var $ = require("nodobjc");
var iphone_simulator_name_getter_1 = require("./iphone-simulator-name-getter");
var IPhoneInteropSimulatorBase = (function (_super) {
    __extends(IPhoneInteropSimulatorBase, _super);
    function IPhoneInteropSimulatorBase(simulator) {
        _super.call(this);
        this.simulator = simulator;
    }
    IPhoneInteropSimulatorBase.prototype.run = function (appPath, applicationIdentifier) {
        return this.execute(this.launch, { canRunMainLoop: true, appPath: appPath, applicationIdentifier: applicationIdentifier });
    };
    IPhoneInteropSimulatorBase.prototype.setupSessionDelegate = function (appPath, applicationIdentifier) {
        var sessionDelegate = $.NSObject.extend("DTiPhoneSimulatorSessionDelegate");
        sessionDelegate.addMethod("session:didEndWithError:", "v@:@@", function (self, sel, sess, error) {
            IPhoneInteropSimulatorBase.logSessionInfo(error, "Session ended without errors.", "Session ended with error ");
            process.exit(0);
        });
        sessionDelegate.addMethod("session:didStart:withError:", "v@:@c@", function (self, sel, session, started, error) {
            IPhoneInteropSimulatorBase.logSessionInfo(error, "Session started without errors.", "Session started with error ");
            console.log(applicationIdentifier + ": " + session("simulatedApplicationPID"));
            if (options.exit) {
                process.exit(0);
            }
        });
        sessionDelegate.register();
        return sessionDelegate;
    };
    IPhoneInteropSimulatorBase.prototype.getTimeout = function () {
        var timeoutParam = IPhoneInteropSimulatorBase.DEFAULT_TIMEOUT_IN_SECONDS;
        if (options.timeout || options.timeout === 0) {
            var parsedValue = parseInt(options.timeout);
            if (!isNaN(parsedValue) && parsedValue > 0) {
                timeoutParam = parsedValue;
            }
            else {
                console.log("Specify the timeout in number of seconds to wait. It should be greater than 0. Default value " + IPhoneInteropSimulatorBase.DEFAULT_TIMEOUT_IN_SECONDS + " seconds will be used.");
            }
        }
        return timeoutParam;
    };
    IPhoneInteropSimulatorBase.prototype.validateDevice = function () {
        if (options.device) {
            var devices = this.simulator.getDevices().wait();
            var validDeviceIdentifiers = _.map(devices, function (device) { return device.id; });
            if (!_.contains(validDeviceIdentifiers, options.device)) {
                errors.fail("Invalid device identifier %s. Valid device identifiers are %s.", options.device, utils.stringify(validDeviceIdentifiers));
            }
        }
    };
    IPhoneInteropSimulatorBase.prototype.launch = function (appPath, applicationIdentifier) {
        var sessionDelegate = this.setupSessionDelegate(appPath, applicationIdentifier);
        var appSpec = this.getClassByName("DTiPhoneSimulatorApplicationSpecifier")("specifierWithApplicationPath", $(appPath));
        var config = this.getClassByName("DTiPhoneSimulatorSessionConfig")("alloc")("init")("autorelease");
        config("setApplicationToSimulateOnStart", appSpec);
        config("setSimulatedApplicationShouldWaitForDebugger", options.waitForDebugger);
        var sdkRoot = options.sdkVersion ? $(this.getSdkRootPathByVersion(options.sdkVersion)) : this.getClassByName("DTiPhoneSimulatorSystemRoot")("defaultRoot");
        config("setSimulatedSystemRoot", sdkRoot);
        this.validateDevice();
        this.simulator.setSimulatedDevice(config);
        if (options.logging) {
            var logPath = this.createLogPipe(appPath).wait();
            fs.createReadStream(logPath, { encoding: "utf8" }).pipe(process.stdout);
            config("setSimulatedApplicationStdErrPath", $(logPath));
            config("setSimulatedApplicationStdOutPath", $(logPath));
        }
        else {
            if (options.stderr) {
                config("setSimulatedApplicationStdErrPath", $(options.stderr));
            }
            if (options.stdout) {
                config("setSimulatedApplicationStdOutPath", $(options.stdout));
            }
        }
        if (options.args) {
            var args = options.args.trim().split(/\s+/);
            var nsArgs = $.NSMutableArray("array");
            args.forEach(function (x) { return nsArgs("addObject", $(x)); });
            config("setSimulatedApplicationLaunchArgs", nsArgs);
        }
        config("setLocalizedClientName", $("ios-sim-portable"));
        var sessionError = new Buffer("");
        var timeoutParam = this.getTimeout();
        var time = $.NSNumber("numberWithDouble", timeoutParam);
        var timeout = time("doubleValue");
        var session = this.getClassByName("DTiPhoneSimulatorSession")("alloc")("init")("autorelease");
        var delegate = sessionDelegate("alloc")("init");
        session("setDelegate", delegate);
        if (!session("requestStartWithConfig", config, "timeout", timeout, "error", sessionError)) {
            errors.fail("Could not start simulator session ", sessionError);
        }
    };
    IPhoneInteropSimulatorBase.prototype.execute = function (action, opts) {
        $.importFramework(IPhoneInteropSimulatorBase.FOUNDATION_FRAMEWORK_NAME);
        $.importFramework(IPhoneInteropSimulatorBase.APPKIT_FRAMEWORK_NAME);
        var developerDirectoryPath = this.findDeveloperDirectory().wait();
        if (!developerDirectoryPath) {
            errors.fail("Unable to find developer directory");
        }
        this.loadFrameworks(developerDirectoryPath);
        var result = action.apply(this, [opts.appPath, opts.applicationIdentifier]);
        return this.runCFLoop(opts.canRunMainLoop, result);
    };
    IPhoneInteropSimulatorBase.prototype.runCFLoop = function (canRunMainLoop, result) {
        var pool = $.NSAutoreleasePool("alloc")("init");
        var future = new Future();
        if (canRunMainLoop) {
            // Keeps the Node loop running
            (function runLoop() {
                if ($.CFRunLoopRunInMode($.kCFRunLoopDefaultMode, 0.1, false)) {
                    setTimeout(runLoop, 0);
                }
                else {
                    pool("release");
                    future.return(result);
                }
            }());
        }
        else {
            future.return(result);
        }
        return future;
    };
    IPhoneInteropSimulatorBase.prototype.loadFrameworks = function (developerDirectoryPath) {
        this.loadFramework(path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.DVT_FOUNDATION_RELATIVE_PATH));
        this.loadFramework(path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.DEV_TOOLS_FOUNDATION_RELATIVE_PATH));
        if (fs.existsSync(path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.CORE_SIMULATOR_RELATIVE_PATH))) {
            this.loadFramework(path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.CORE_SIMULATOR_RELATIVE_PATH));
        }
        var platformsError = null;
        var dvtPlatformClass = this.getClassByName("DVTPlatform");
        if (!dvtPlatformClass("loadAllPlatformsReturningError", platformsError)) {
            errors.fail("Unable to loadAllPlatformsReturningError ", platformsError);
        }
        var simulatorFrameworkPath = path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.SIMULATOR_FRAMEWORK_RELATIVE_PATH_LEGACY);
        if (!fs.existsSync(simulatorFrameworkPath)) {
            simulatorFrameworkPath = path.join(developerDirectoryPath, IPhoneInteropSimulatorBase.SIMULATOR_FRAMEWORK_RELATIVE_PATH);
        }
        this.loadFramework(simulatorFrameworkPath);
    };
    IPhoneInteropSimulatorBase.prototype.loadFramework = function (frameworkPath) {
        var bundle = $.NSBundle("bundleWithPath", $(frameworkPath));
        if (!bundle("load")) {
            errors.fail("Unable to load ", frameworkPath);
        }
    };
    IPhoneInteropSimulatorBase.prototype.findDeveloperDirectory = function () {
        var future = new Future();
        var capturedOut = "";
        var capturedErr = "";
        var childProcess = child_process.spawn("xcode-select", ["-print-path"]);
        if (childProcess.stdout) {
            childProcess.stdout.on("data", function (data) {
                capturedOut += data;
            });
        }
        if (childProcess.stderr) {
            childProcess.stderr.on("data", function (data) {
                capturedErr += data;
            });
        }
        childProcess.on("close", function (arg) {
            var exitCode = typeof arg == 'number' ? arg : arg && arg.code;
            if (exitCode === 0) {
                future.return(capturedOut ? capturedOut.trim() : null);
            }
            else {
                future.throw(util.format("Command xcode-select -print-path failed with exit code %s. Error output: \n %s", exitCode, capturedErr));
            }
        });
        return future;
    };
    IPhoneInteropSimulatorBase.prototype.getClassByName = function (className) {
        return $.classDefinition.getClassByName(className);
    };
    IPhoneInteropSimulatorBase.logSessionInfo = function (error, successfulMessage, errorMessage) {
        if (error) {
            console.log(util.format("%s %s", errorMessage, error));
            process.exit(1);
        }
        console.log(successfulMessage);
    };
    IPhoneInteropSimulatorBase.prototype.getSdkRootPathByVersion = function (version) {
        var sdks = this.getInstalledSdks();
        var sdk = _.find(sdks, function (sdk) { return sdk.version === version; });
        if (!sdk) {
            errors.fail("Unable to find installed sdk with version %s. Verify that you have specified correct version and the sdk with that version is installed.", version);
        }
        return sdk.rootPath;
    };
    IPhoneInteropSimulatorBase.prototype.getInstalledSdks = function () {
        var systemRootClass = this.getClassByName("DTiPhoneSimulatorSystemRoot");
        var roots = systemRootClass("knownRoots");
        var count = roots("count");
        var sdks = [];
        for (var index = 0; index < count; index++) {
            var root = roots("objectAtIndex", index);
            var displayName = root("sdkDisplayName").toString();
            var version = root("sdkVersion").toString();
            var rootPath = root("sdkRootPath").toString();
            sdks.push(new Sdk(displayName, version, rootPath));
        }
        return sdks;
    };
    IPhoneInteropSimulatorBase.prototype.createLogPipe = function (appPath) {
        var future = new Future();
        var logPath = path.join(path.dirname(appPath), "." + path.basename(appPath, ".app") + ".log");
        var command = util.format("rm -f \"%s\" && mkfifo \"%s\"", logPath, logPath);
        child_process.exec(command, function (error, stdout, stderr) {
            if (error) {
                future.throw(error);
            }
            else {
                future.return(logPath);
            }
        });
        return future;
    };
    IPhoneInteropSimulatorBase.FOUNDATION_FRAMEWORK_NAME = "Foundation";
    IPhoneInteropSimulatorBase.APPKIT_FRAMEWORK_NAME = "AppKit";
    IPhoneInteropSimulatorBase.DVT_FOUNDATION_RELATIVE_PATH = "../SharedFrameworks/DVTFoundation.framework";
    IPhoneInteropSimulatorBase.DEV_TOOLS_FOUNDATION_RELATIVE_PATH = "../OtherFrameworks/DevToolsFoundation.framework";
    IPhoneInteropSimulatorBase.CORE_SIMULATOR_RELATIVE_PATH = "Library/PrivateFrameworks/CoreSimulator.framework";
    IPhoneInteropSimulatorBase.SIMULATOR_FRAMEWORK_RELATIVE_PATH_LEGACY = "Platforms/iPhoneSimulator.platform/Developer/Library/PrivateFrameworks/DVTiPhoneSimulatorRemoteClient.framework";
    IPhoneInteropSimulatorBase.SIMULATOR_FRAMEWORK_RELATIVE_PATH = "../SharedFrameworks/DVTiPhoneSimulatorRemoteClient.framework";
    IPhoneInteropSimulatorBase.DEFAULT_TIMEOUT_IN_SECONDS = 90;
    return IPhoneInteropSimulatorBase;
})(iphone_simulator_name_getter_1.IPhoneSimulatorNameGetter);
exports.IPhoneInteropSimulatorBase = IPhoneInteropSimulatorBase;
var Sdk = (function () {
    function Sdk(displayName, version, rootPath) {
        this.displayName = displayName;
        this.version = version;
        this.rootPath = rootPath;
    }
    Sdk.prototype.sdkInfo = function () {
        return [util.format("    Display Name: %s", this.displayName),
            util.format("    Version: %s", this.version),
            util.format("    Root path: %s", this.rootPath)].join(os.EOL);
    };
    return Sdk;
})();
//# sourceMappingURL=iphone-interop-simulator-base.js.map