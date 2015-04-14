///<reference path="./.d.ts"/>
"use strict";
var child_process = require("child_process");
var fs = require("fs");
var Future = require("fibers/future");
var os = require("os");
var path = require("path");
var util = require("util");

var errors = require("./errors");
var options = require("./options");
var utils = require("./utils");
var xcode6SimulatorLib = require("./iphone-simulator-xcode-6");
var xcode5SimulatorLib = require("./iphone-simulator-xcode-5");

var $ = require("NodObjC");

var iPhoneSimulator = (function () {
    function iPhoneSimulator() {
    }
    iPhoneSimulator.prototype.run = function (appPath) {
        if (!fs.existsSync(appPath)) {
            errors.fail("Path does not exist ", appPath);
        }

        return this.execute(this.launch, { canRunMainLoop: true, appPath: appPath });
    };

    iPhoneSimulator.prototype.printDeviceTypes = function () {
        var _this = this;
        var action = function () {
            var simulator = _this.createSimulator();
            _.each(simulator.deviceIdentifiersInfo, function (identifier) {
                return console.log(identifier);
            });
        };

        return this.execute(action, { canRunMainLoop: false });
    };

    iPhoneSimulator.prototype.printSDKS = function () {
        var _this = this;
        var action = function () {
            var systemRootClass = _this.getClassByName("DTiPhoneSimulatorSystemRoot");
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

            sdks = _.sortBy(sdks, function (sdk) {
                return sdk.version;
            });
            _.each(sdks, function (sdk) {
                return console.log(sdk.sdkInfo() + os.EOL);
            });
        };

        return this.execute(action, { canRunMainLoop: false });
    };

    iPhoneSimulator.prototype.execute = function (action, opts) {
        $.importFramework(iPhoneSimulator.FOUNDATION_FRAMEWORK_NAME);
        $.importFramework(iPhoneSimulator.APPKIT_FRAMEWORK_NAME);

        var pool = $.NSAutoreleasePool("alloc")("init");

        var developerDirectoryPath = this.findDeveloperDirectory().wait();
        if (!developerDirectoryPath) {
            errors.fail("Unable to find developer directory");
        }

        this.loadFrameworks(developerDirectoryPath);

        action.apply(this, [opts.appPath]);

        var future = new Future();
        if (opts.canRunMainLoop) {
            // Keeps the Node loop running
            (function runLoop() {
                if ($.CFRunLoopRunInMode($.kCFRunLoopDefaultMode, 0.1, false)) {
                    setTimeout(runLoop, 0);
                } else {
                    pool("release");
                    future.return();
                }
            }());
        } else {
            future.return();
        }
        return future;
    };

    iPhoneSimulator.prototype.launch = function (appPath) {
        var sessionDelegate = $.NSObject.extend("DTiPhoneSimulatorSessionDelegate");
        sessionDelegate.addMethod("session:didEndWithError:", "v@:@@", function (self, sel, sess, error) {
            iPhoneSimulator.logSessionInfo(error, "Session ended without errors.", "Session ended with error ");
            process.exit(0);
        });
        sessionDelegate.addMethod("session:didStart:withError:", "v@:@c@", function (self, sel, session, started, error) {
            iPhoneSimulator.logSessionInfo(error, "Session started without errors.", "Session started with error ");
            if (options.exit) {
                process.exit(0);
            }
        });
        sessionDelegate.register();

        var appSpec = this.getClassByName("DTiPhoneSimulatorApplicationSpecifier")("specifierWithApplicationPath", $(appPath));
        var config = this.getClassByName("DTiPhoneSimulatorSessionConfig")("alloc")("init")("autorelease");
        config("setApplicationToSimulateOnStart", appSpec);

        var sdkRoot = options.sdkRoot ? $(options.sdkRoot) : this.getClassByName("DTiPhoneSimulatorSystemRoot")("defaultRoot");
        config("setSimulatedSystemRoot", sdkRoot);

        var simulator = this.createSimulator(config);
        if (options.device) {
            var validDeviceIdentifiers = simulator.validDeviceIdentifiers;
            if (!_.contains(validDeviceIdentifiers, options.device)) {
                errors.fail("Invalid device identifier %s. Valid device identifiers are %s.", options.device, utils.stringify(validDeviceIdentifiers));
            }
        }
        simulator.setSimulatedDevice(config);

        if (options.logging) {
            var logPath = this.createLogPipe(appPath).wait();
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
            var args = options.args.trim().split(/\s+/);
            var nsArgs = $.NSMutableArray("array");
            args.forEach(function (x) {
                return nsArgs("addObject", $(x));
            });
            config("setSimulatedApplicationLaunchArgs", nsArgs);
        }

        config("setLocalizedClientName", $("ios-sim-portable"));

        var sessionError = new Buffer("");
        var timeoutParam = iPhoneSimulator.DEFAULT_TIMEOUT_IN_SECONDS;
        if (options.timeout || options.timeout === 0) {
            var parsedValue = parseInt(options.timeout);
            if (!isNaN(parsedValue) && parsedValue > 0) {
                timeoutParam = parsedValue;
            } else {
                console.log(util.format("Specify the timeout in number of seconds to wait. It should be greater than 0. Default value %s seconds will be used.", iPhoneSimulator.DEFAULT_TIMEOUT_IN_SECONDS.toString()));
            }
        }

        var time = $.NSNumber("numberWithDouble", timeoutParam);
        var timeout = time("doubleValue");

        var session = this.getClassByName("DTiPhoneSimulatorSession")("alloc")("init")("autorelease");
        var delegate = sessionDelegate("alloc")("init");
        session("setDelegate", delegate);

        if (!session("requestStartWithConfig", config, "timeout", timeout, "error", sessionError)) {
            errors.fail("Could not start simulator session ", sessionError);
        }
    };

    iPhoneSimulator.prototype.loadFrameworks = function (developerDirectoryPath) {
        this.loadFramework(path.join(developerDirectoryPath, iPhoneSimulator.DVT_FOUNDATION_RELATIVE_PATH));
        this.loadFramework(path.join(developerDirectoryPath, iPhoneSimulator.DEV_TOOLS_FOUNDATION_RELATIVE_PATH));

        if (fs.existsSync(path.join(developerDirectoryPath, iPhoneSimulator.CORE_SIMULATOR_RELATIVE_PATH))) {
            this.loadFramework(path.join(developerDirectoryPath, iPhoneSimulator.CORE_SIMULATOR_RELATIVE_PATH));
        }

        var platformsError = null;
        var dvtPlatformClass = this.getClassByName("DVTPlatform");
        if (!dvtPlatformClass("loadAllPlatformsReturningError", platformsError)) {
            errors.fail("Unable to loadAllPlatformsReturningError ", platformsError);
        }

        var simulatorFrameworkPath = path.join(developerDirectoryPath, iPhoneSimulator.SIMULATOR_FRAMEWORK_RELATIVE_PATH_LEGACY);
        if (!fs.existsSync(simulatorFrameworkPath)) {
            simulatorFrameworkPath = path.join(developerDirectoryPath, iPhoneSimulator.SIMULATOR_FRAMEWORK_RELATIVE_PATH);
        }
        this.loadFramework(simulatorFrameworkPath);
    };

    iPhoneSimulator.prototype.loadFramework = function (frameworkPath) {
        var bundle = $.NSBundle("bundleWithPath", $(frameworkPath));
        if (!bundle("load")) {
            errors.fail("Unable to load ", frameworkPath);
        }
    };

    iPhoneSimulator.prototype.findDeveloperDirectory = function () {
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
            } else {
                future.throw(util.format("Command xcode-select -print-path failed with exit code %s. Error output: \n %s", exitCode, capturedErr));
            }
        });

        return future;
    };

    iPhoneSimulator.prototype.getClassByName = function (className) {
        return $.classDefinition.getClassByName(className);
    };

    iPhoneSimulator.logSessionInfo = function (error, successfulMessage, errorMessage) {
        if (error) {
            console.log(util.format("%s %s", errorMessage, error));
            process.exit(1);
        }

        console.log(successfulMessage);
    };

    iPhoneSimulator.prototype.createSimulator = function (config) {
        if (!config) {
            config = this.getClassByName("DTiPhoneSimulatorSessionConfig")("alloc")("init")("autorelease");
        }

        var simulator;
        if (_.contains(config.methods(), "setDevice:")) {
            simulator = new xcode6SimulatorLib.XCode6Simulator();
        } else {
            simulator = new xcode5SimulatorLib.XCode5Simulator();
        }

        return simulator;
    };

    iPhoneSimulator.prototype.createLogPipe = function (appPath) {
        var future = new Future();
        var logPath = path.join(path.dirname(appPath), "." + path.basename(appPath, ".app") + ".log");

        var command = util.format("rm -f %s && mkfifo %s", logPath, logPath);
        child_process.exec(command, function (error, stdout, stderr) {
            if (error) {
                future.throw(error);
            } else {
                future.return(logPath);
            }
        });

        return future;
    };
    iPhoneSimulator.FOUNDATION_FRAMEWORK_NAME = "Foundation";
    iPhoneSimulator.APPKIT_FRAMEWORK_NAME = "AppKit";

    iPhoneSimulator.DVT_FOUNDATION_RELATIVE_PATH = "../SharedFrameworks/DVTFoundation.framework";
    iPhoneSimulator.DEV_TOOLS_FOUNDATION_RELATIVE_PATH = "../OtherFrameworks/DevToolsFoundation.framework";
    iPhoneSimulator.CORE_SIMULATOR_RELATIVE_PATH = "Library/PrivateFrameworks/CoreSimulator.framework";
    iPhoneSimulator.SIMULATOR_FRAMEWORK_RELATIVE_PATH_LEGACY = "Platforms/iPhoneSimulator.platform/Developer/Library/PrivateFrameworks/DVTiPhoneSimulatorRemoteClient.framework";
    iPhoneSimulator.SIMULATOR_FRAMEWORK_RELATIVE_PATH = "../SharedFrameworks/DVTiPhoneSimulatorRemoteClient.framework";

    iPhoneSimulator.DEFAULT_TIMEOUT_IN_SECONDS = 90;
    return iPhoneSimulator;
})();
exports.iPhoneSimulator = iPhoneSimulator;

var Sdk = (function () {
    function Sdk(displayName, version, rootPath) {
        this.displayName = displayName;
        this.version = version;
        this.rootPath = rootPath;
    }
    Sdk.prototype.sdkInfo = function () {
        return [
            util.format("    Display Name: %s", this.displayName),
            util.format("    Version: %s", this.version),
            util.format("    Root path: %s", this.rootPath)].join(os.EOL);
    };
    return Sdk;
})();
//# sourceMappingURL=iphone-simulator.js.map
