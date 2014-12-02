///<reference path="./.d.ts"/>
"use strict";
var errors = require("./errors");
var options = require("./options");

var util = require("util");
var $ = require("NodObjC");

var XCode6Simulator = (function () {
    function XCode6Simulator() {
        this.availableDevices = Object.create(null);
    }
    Object.defineProperty(XCode6Simulator.prototype, "validDeviceIdentifiers", {
        get: function () {
            return XCode6Simulator.allowedDeviceIdentifiers;
        },
        enumerable: true,
        configurable: true
    });

    XCode6Simulator.prototype.setSimulatedDevice = function (config) {
        var device = this.getDeviceByIdentifier(this.deviceIdentifier);
        config("setDevice", device);
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
                    var deviceTypeIdentifier = device("deviceType")("identifier").toString();
                    var runtimeVersion = device("runtime")("versionString").toString();
                    this.availableDevices[deviceTypeIdentifier] = {
                        device: device,
                        deviceTypeIdentifier: deviceTypeIdentifier,
                        runtimeVersion: runtimeVersion
                    };
                }
            }
        }

        return this.availableDevices;
    };

    XCode6Simulator.prototype.getDeviceByIdentifier = function (deviceIdentifier) {
        var fullDeviceIdentifier = util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceIdentifier);
        var availableDevices = this.getAvailableDevices();
        if (!_.isEmpty(availableDevices)) {
            var selectedDevice = availableDevices[fullDeviceIdentifier];
            if (selectedDevice) {
                return selectedDevice.device;
            }
        }

        errors.fail("Unable to find device with identifier ", deviceIdentifier);
    };
    XCode6Simulator.DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
    XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER = "iPhone-4s";

    XCode6Simulator.allowedDeviceIdentifiers = [
        "iPhone-4s",
        "iPhone-5",
        "iPhone-5s",
        "iPhone-6",
        "iPhone-6-Plus",
        "Resizable-iPhone",
        "iPad-2",
        "iPad-Retina",
        "iPad-Air",
        "Resizable-iPad"
    ];
    return XCode6Simulator;
})();
exports.XCode6Simulator = XCode6Simulator;
//# sourceMappingURL=iphone-simulator-xcode-6.js.map
