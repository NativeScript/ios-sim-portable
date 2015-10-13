///<reference path="./.d.ts"/>
"use strict";
var errors = require("./errors");
var options = require("./options");
var util = require("util");
var os = require("os");
var child_process = require("child_process");
var Future = require("fibers/future");
var $ = require("NodObjC");
var XCode6Simulator = (function () {
    function XCode6Simulator() {
        this.devices = this.getAvailableDevices().wait();
    }
    Object.defineProperty(XCode6Simulator.prototype, "validDeviceIdentifiers", {
        get: function () {
            return _.map(this.devices, function (device) { return device.deviceIdentifier; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(XCode6Simulator.prototype, "deviceIdentifiersInfo", {
        get: function () {
            return _.map(this.devices, function (device) { return util.format("Device Identifier: %s. %sRuntime Version: %s %s", device.fullDeviceIdentifier, os.EOL, device.runtimeVersion, os.EOL); });
        },
        enumerable: true,
        configurable: true
    });
    XCode6Simulator.prototype.setSimulatedDevice = function (config) { };
    XCode6Simulator.prototype.getSimulatedDevice = function () {
        return this.getDeviceByIdentifier(this.deviceIdentifier);
    };
    Object.defineProperty(XCode6Simulator.prototype, "deviceIdentifier", {
        get: function () {
            return options.device || XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER;
        },
        enumerable: true,
        configurable: true
    });
    XCode6Simulator.prototype.getDeviceByIdentifier = function (deviceIdentifier) {
        var device = _.find(this.devices, function (dev) { return dev.deviceIdentifier === deviceIdentifier; });
        if (!device) {
            errors.fail("Unable to find device with identifier ", deviceIdentifier);
        }
        return device;
    };
    XCode6Simulator.prototype.buildFullDeviceIdentifier = function (deviceName) {
        return util.format("%s.%s", XCode6Simulator.DEVICE_IDENTIFIER_PREFIX, deviceName);
    };
    XCode6Simulator.prototype.simctlExec = function (command, args) {
        args = ["xcrun", "simctl", command].concat(args);
        console.log(util.format("Executing: xcrun with args: %s", args.join(' ')));
        var future = new Future();
        child_process.exec(args.join(" "), function (error, stdout, stderr) {
            if (error) {
                errors.fail(error.message);
            }
            else if (stderr) {
                errors.fail("simctl error: %s", stderr.toString());
            }
            else {
                future.return(stdout.toString());
            }
        });
        return future;
    };
    XCode6Simulator.prototype.launch = function (udid, bundleId) {
        return this.simctlExec('launch', [udid, bundleId]);
    };
    XCode6Simulator.prototype.getAvailableDevices = function () {
        var _this = this;
        return (function () {
            var rowDevices = _this.simctlExec("list", ["devices"]).wait();
            console.log("ROW DEVICESS!!!");
            console.log(rowDevices);
            // expect to get a listing like
            // -- iOS 8.1 --
            //     iPhone 4s (3CA6E7DD-220E-45E5-B716-1E992B3A429C) (Shutdown)
            //     ...
            // -- iOS 8.2 --
            //     iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
            //     ...
            // so, get the `-- iOS X.X --` line to find the sdk (X.X)
            // and the rest of the listing in order to later find the devices
            var deviceSectionReg = /-- (iOS|watchOS) (.+) --(\n    .+)*/mg;
            var matches = [];
            var match = deviceSectionReg.exec(rowDevices);
            // make an entry for each sdk version
            while (match !== null) {
                matches.push(match);
                match = deviceSectionReg.exec(rowDevices);
            }
            if (matches.length < 1) {
                throw new Error('Could not find device section. ' + match);
            }
            // get all the devices for each sdk
            var devices = [];
            for (var _i = 0; _i < matches.length; _i++) {
                match = matches[_i];
                var sdk = match[2];
                // split the full match into lines and remove the first
                for (var _a = 0, _b = match[0].split('\n').slice(1); _a < _b.length; _a++) {
                    var line = _b[_a];
                    // a line is something like
                    //    iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
                    // retrieve:
                    //   iPhone 4s
                    //   A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E
                    //   Shutdown
                    var lineReg = /^    ([^\(]+) \(([^\)]+)\) \(([^\)]+)\)( \(([^\)]+)\))*/;
                    var lineMatch = lineReg.exec(line);
                    if (lineMatch === null) {
                        throw new Error('Could not match line. ' + line);
                    }
                    var available = lineMatch[4];
                    if (available) {
                        // save the whole thing as ab object in the list for this sdk
                        devices.push({
                            name: lineMatch[1],
                            deviceIdentifier: lineMatch[2],
                            fullDeviceIdentifier: _this.buildFullDeviceIdentifier(lineMatch[1]),
                            state: lineMatch[3],
                            runtimeVersion: sdk,
                        });
                    }
                }
            }
            return devices;
        }).future()();
    };
    XCode6Simulator.DEVICE_IDENTIFIER_PREFIX = "com.apple.CoreSimulator.SimDeviceType";
    XCode6Simulator.DEFAULT_DEVICE_IDENTIFIER = "iPhone-4s";
    return XCode6Simulator;
})();
exports.XCode6Simulator = XCode6Simulator;
//# sourceMappingURL=iphone-simulator-xcode-6.js.map