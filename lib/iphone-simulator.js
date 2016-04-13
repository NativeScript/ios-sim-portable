///<reference path="./.d.ts"/>
"use strict";
var fs = require("fs");
var os = require("os");
var errors = require("./errors");
var options = require("./options");
var xcode = require("./xcode");
var xcode7SimulatorLib = require("./iphone-simulator-xcode-7");
var xcode6SimulatorLib = require("./iphone-simulator-xcode-6");
var xcode5SimulatorLib = require("./iphone-simulator-xcode-5");
var $ = require("nodobjc");
var iPhoneSimulator = (function () {
    function iPhoneSimulator() {
        this.simulator = null;
        this.simulator = this.createSimulator().wait();
    }
    iPhoneSimulator.prototype.run = function (applicationPath, applicationIdentifier) {
        if (!fs.existsSync(applicationPath)) {
            errors.fail("Path does not exist ", applicationPath);
        }
        if (options.device) {
            var deviceNames = _.unique(_.map(this.simulator.getDevices().wait(), function (device) { return device.name; }));
            if (!_.contains(deviceNames, options.device)) {
                errors.fail("Unable to find device " + options.device + ". The valid device names are " + deviceNames.join(", "));
            }
        }
        if (options.sdkVersion) {
            var runtimeVersions = _.unique(_.map(this.simulator.getDevices().wait(), function (device) { return device.runtimeVersion; }));
            if (!_.contains(runtimeVersions, options.sdkVersion)) {
                errors.fail("Unable to find sdk " + options.sdkVersion + ". The valid runtime versions are " + runtimeVersions.join(", "));
            }
        }
        return this.simulator.run(applicationPath, applicationIdentifier);
    };
    iPhoneSimulator.prototype.printDeviceTypes = function () {
        var _this = this;
        return (function () {
            var devices = _this.simulator.getDevices().wait();
            _.each(devices, function (device) { return console.log("Device Identifier: " + device.fullId + ". " + os.EOL + "Runtime version: " + device.runtimeVersion + " " + os.EOL); });
        }).future()();
    };
    iPhoneSimulator.prototype.printSDKS = function () {
        var _this = this;
        return (function () {
            var sdks = _this.simulator.getSdks().wait();
            _.each(sdks, function (sdk) {
                var output = "    Display Name: " + sdk.displayName + " " + os.EOL + "    Version: " + sdk.version + " " + os.EOL;
                if (sdk.rootPath) {
                    output += "    Root path: " + sdk.rootPath + " " + os.EOL;
                }
                console.log(output);
            });
        }).future()();
    };
    iPhoneSimulator.prototype.sendNotification = function (notification) {
        if (!notification) {
            errors.fail("Notification required.");
        }
        return this.simulator.sendNotification(notification);
    };
    iPhoneSimulator.prototype.createSimulator = function () {
        return (function () {
            var xcodeVersionData = xcode.getXcodeVersionData().wait();
            var majorVersion = xcodeVersionData.major;
            var simulator = null;
            if (majorVersion === "7") {
                simulator = new xcode7SimulatorLib.XCode7Simulator();
            }
            else if (majorVersion === "6") {
                simulator = new xcode6SimulatorLib.XCode6Simulator();
            }
            else if (majorVersion === "5") {
                simulator = new xcode5SimulatorLib.XCode5Simulator();
            }
            else {
                errors.fail("Unsupported xcode version " + xcodeVersionData.major + ".");
            }
            return simulator;
        }).future()();
    };
    return iPhoneSimulator;
})();
exports.iPhoneSimulator = iPhoneSimulator;
//# sourceMappingURL=iphone-simulator.js.map