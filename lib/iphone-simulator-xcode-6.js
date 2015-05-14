///<reference path="./.d.ts"/>
"use strict";
var errors = require("./errors");
var options = require("./options");

var util = require("util");
var os = require("os");
var $ = require("NodObjC");

var XCode6Simulator = (function () {
    function XCode6Simulator() {
        this.availableDevices = Object.create(null);
    }
    Object.defineProperty(XCode6Simulator.prototype, "validDeviceIdentifiers", {
        get: function () {
            var devices = this.getDevicesInfo();
            return _.map(devices, function (device) {
                return device.deviceIdentifier;
            });
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(XCode6Simulator.prototype, "deviceIdentifiersInfo", {
        get: function () {
            var devices = this.getDevicesInfo();
            return _.map(devices, function (device) {
                return util.format("Device Identifier: %s. %sRuntime Version: %s %s", device.fullDeviceIdentifier, os.EOL, device.runtimeVersion, os.EOL);
            });
        },
        enumerable: true,
        configurable: true
    });

    XCode6Simulator.prototype.setSimulatedDevice = function (config) {
        var device = this.getDeviceByIdentifier(this.deviceIdentifier);
        config("setDevice", device);
    };

    XCode6Simulator.prototype.getSimulatedDevice = function () {
        return this.getDeviceByIdentifier(this.deviceIdentifier);
    };

    XCode6Simulator.prototype.getDevicesInfo = function () {
        return _(this.getAvailableDevices()).map(_.identity).flatten().value();
    };

    Object.defineProperty(XCode6Simulator.prototype, "deviceIdentifier", {
        get: function () {
            return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
        },
        enumerable: true,
        configurable: true
    });

    XCode6Simulator.prototype.getAvailableDevices = function () {
        if (_.isEmpty(this.availableDevices)) {
            var deviceSet = $.classDefinition.getClassByName("SimDeviceSet")("defaultSet");
            var devices = deviceSet("availableDevices");
            var count = devices("count");
            if (count > 0) {
                for (var index = 0; index < count; index++) {
                    var device = devices("objectAtIndex", index);

                    var deviceIdentifier = device("deviceType")("identifier").toString();
                    var deviceIdentifierPrefixIndex = deviceIdentifier.indexOf(XCode6Simulator.DEVICE_IDENTIFIER_PREFIX);
                    var deviceIdentifierWithoutPrefix = deviceIdentifier.substring(deviceIdentifierPrefixIndex + XCode6Simulator.DEVICE_IDENTIFIER_PREFIX.length + 1);

                    var runtimeVersion = device("runtime")("versionString").toString();

                    if (!this.availableDevices[deviceIdentifier]) {
                        this.availableDevices[deviceIdentifier] = [];
                    }

                    this.availableDevices[deviceIdentifier].push({
                        device: device,
                        deviceIdentifier: deviceIdentifierWithoutPrefix,
                        fullDeviceIdentifier: this.buildFullDeviceIdentifier(deviceIdentifier),
                        runtimeVersion: runtimeVersion
                    });
                }
            }
        }

        return this.availableDevices;
    };

    XCode6Simulator.prototype.getDeviceByIdentifier = function (deviceIdentifier) {
        var availableDevices = this.getAvailableDevices();
        if (!_.isEmpty(availableDevices)) {
            var fullDeviceIdentifier = this.buildFullDeviceIdentifier(deviceIdentifier);
            var selectedDevice = availableDevices[fullDeviceIdentifier];
            if (selectedDevice) {
                return selectedDevice[0].device;
            }
        }

        errors.fail("Unable to find device with identifier ", deviceIdentifier);
    };

    XCode6Simulator.prototype.buildFullDeviceIdentifier = function (deviceIdentifier) {
        return util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceIdentifier);
    };
    XCode6Simulator.DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
    XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER = "iPhone-4s";
    return XCode6Simulator;
})();
exports.XCode6Simulator = XCode6Simulator;
//# sourceMappingURL=iphone-simulator-xcode-6.js.map
