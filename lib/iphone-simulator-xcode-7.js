///<reference path="./.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var childProcess = require("./child-process");
var errors = require("./errors");
var common = require("./iphone-simulator-common");
var options = require("./options");
var simctl_1 = require("./simctl");
var utils = require("./utils");
var iphone_simulator_name_getter_1 = require("./iphone-simulator-name-getter");
var XCode7Simulator = (function (_super) {
    __extends(XCode7Simulator, _super);
    function XCode7Simulator() {
        _super.call(this);
        this.defaultDeviceIdentifier = "iPhone 6";
        this.simctl = null;
        this.simctl = new simctl_1.Simctl();
    }
    XCode7Simulator.prototype.getDevices = function () {
        return this.simctl.getDevices();
    };
    XCode7Simulator.prototype.getSdks = function () {
        var _this = this;
        return (function () {
            var devices = _this.simctl.getDevices().wait();
            return _.map(devices, function (device) {
                return {
                    displayName: "iOS " + device.runtimeVersion,
                    version: device.runtimeVersion
                };
            });
        }).future()();
    };
    XCode7Simulator.prototype.run = function (applicationPath, applicationIdentifier) {
        var _this = this;
        return (function () {
            var device = _this.getDeviceToRun().wait();
            var currentBootedDevice = _.find(_this.getDevices().wait(), function (device) { return _this.isDeviceBooted(device); });
            if (currentBootedDevice && (currentBootedDevice.name.toLowerCase() !== device.name.toLowerCase() || currentBootedDevice.runtimeVersion !== device.runtimeVersion)) {
                _this.killSimulator().wait();
            }
            _this.startSimulator(device).wait();
            _this.simctl.install(device.id, applicationPath).wait();
            var launchResult = _this.simctl.launch(device.id, applicationIdentifier).wait();
            if (options.logging) {
                _this.printDeviceLog(device.id, launchResult);
            }
        }).future()();
    };
    XCode7Simulator.prototype.sendNotification = function (notification) {
        var _this = this;
        return (function () {
            var device = _this.getBootedDevice().wait();
            if (!device) {
                errors.fail("Could not find device.");
            }
            _this.simctl.notifyPost("booted", notification).wait();
        }).future()();
    };
    XCode7Simulator.prototype.getApplicationPath = function (deviceId, applicationIdentifier) {
        return this.simctl.getAppContainer(deviceId, applicationIdentifier);
    };
    XCode7Simulator.prototype.getInstalledApplications = function (deviceId) {
        return common.getInstalledApplications(deviceId);
    };
    XCode7Simulator.prototype.installApplication = function (deviceId, applicationPath) {
        return this.simctl.install(deviceId, applicationPath);
    };
    XCode7Simulator.prototype.uninstallApplication = function (deviceId, appIdentifier) {
        return this.simctl.uninstall(deviceId, appIdentifier, { skipError: true });
    };
    XCode7Simulator.prototype.startApplication = function (deviceId, appIdentifier) {
        return this.simctl.launch(deviceId, appIdentifier);
    };
    XCode7Simulator.prototype.stopApplication = function (deviceId, cfBundleExecutable) {
        try {
            return childProcess.exec("killall " + cfBundleExecutable, { skipError: true });
        }
        catch (e) {
        }
    };
    XCode7Simulator.prototype.printDeviceLog = function (deviceId, launchResult) {
        common.printDeviceLog(deviceId, launchResult);
    };
    XCode7Simulator.prototype.getDeviceToRun = function () {
        var _this = this;
        return (function () {
            var devices = _this.simctl.getDevices().wait();
            var result = _.find(devices, function (device) {
                if (options.sdkVersion && !options.device) {
                    return device.runtimeVersion === options.sdkVersion;
                }
                if (options.device && !options.sdkVersion) {
                    return device.name === options.device;
                }
                if (options.device && options.sdkVersion) {
                    return device.runtimeVersion === options.sdkVersion && device.name === options.device;
                }
                if (!options.sdkVersion && !options.device) {
                    return _this.isDeviceBooted(device);
                }
            });
            if (!result) {
                result = _.find(devices, function (device) { return device.name === _this.defaultDeviceIdentifier; });
            }
            if (!result) {
                var sortedDevices = _.sortBy(devices, function (device) { return device.runtimeVersion; });
                result = _.last(sortedDevices);
            }
            return result;
        }).future()();
    };
    XCode7Simulator.prototype.isDeviceBooted = function (device) {
        return device.state === 'Booted';
    };
    XCode7Simulator.prototype.getBootedDevice = function () {
        var _this = this;
        return (function () {
            var devices = _this.simctl.getDevices().wait();
            return _.find(devices, function (device) { return _this.isDeviceBooted(device); });
        }).future()();
    };
    XCode7Simulator.prototype.startSimulator = function (device) {
        var _this = this;
        return (function () {
            device = device || _this.getDeviceToRun().wait();
            if (!_this.isDeviceBooted(device)) {
                common.startSimulator(device.id).wait();
                // startSimulaltor doesn't always finish immediately, and the subsequent
                // install fails since the simulator is not running.
                // Give it some time to start before we attempt installing.
                utils.sleep(1000);
            }
        }).future()();
    };
    XCode7Simulator.prototype.killSimulator = function () {
        return childProcess.spawn("pkill", ["-9", "-f", "Simulator"]);
    };
    XCode7Simulator.DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
    return XCode7Simulator;
})(iphone_simulator_name_getter_1.IPhoneSimulatorNameGetter);
exports.XCode7Simulator = XCode7Simulator;
//# sourceMappingURL=iphone-simulator-xcode-7.js.map