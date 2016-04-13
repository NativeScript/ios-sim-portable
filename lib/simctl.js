///<reference path="./.d.ts"/>
"use strict";
var childProcess = require("./child-process");
var errors = require("./errors");
var options = require("./options");
var Simctl = (function () {
    function Simctl() {
    }
    Simctl.prototype.launch = function (deviceId, appIdentifier) {
        var _this = this;
        return (function () {
            var args = [];
            if (options.waitForDebugger) {
                args.push("-w");
            }
            args = args.concat([deviceId, appIdentifier]);
            if (options.args) {
                var applicationArgs = options.args.trim().split(/\s+/);
                _.each(applicationArgs, function (arg) { return args.push(arg); });
            }
            var result = _this.simctlExec("launch", args).wait();
            if (options.waitForDebugger) {
                console.log(appIdentifier + ": " + result);
            }
            return result;
        }).future()();
    };
    Simctl.prototype.install = function (deviceId, applicationPath) {
        return this.simctlExec("install", [deviceId, applicationPath]);
    };
    Simctl.prototype.uninstall = function (deviceId, appIdentifier, opts) {
        return this.simctlExec("uninstall", [deviceId, appIdentifier], opts);
    };
    Simctl.prototype.notifyPost = function (deviceId, notification) {
        return this.simctlExec("notify_post", [deviceId, notification]);
    };
    Simctl.prototype.getAppContainer = function (deviceId, appIdentifier) {
        var _this = this;
        return (function () {
            try {
                return _this.simctlExec("get_app_container", [deviceId, appIdentifier]).wait();
            }
            catch (e) {
                if (e.message.indexOf("No such file or directory") > -1) {
                    return null;
                }
                throw e;
            }
        }).future()();
    };
    Simctl.prototype.getDevices = function () {
        var _this = this;
        return (function () {
            var rawDevices = _this.simctlExec("list", ["devices"]).wait();
            // expect to get a listing like
            // -- iOS 8.1 --
            //     iPhone 4s (3CA6E7DD-220E-45E5-B716-1E992B3A429C) (Shutdown)
            //     ...
            // -- iOS 8.2 --
            //     iPhone 4s (A99FFFC3-8E19-4DCF-B585-7D9D46B4C16E) (Shutdown)
            //     ...
            // so, get the `-- iOS X.X --` line to find the sdk (X.X)
            // and the rest of the listing in order to later find the devices
            var deviceSectionRegex = /-- (iOS) (.+) --(\n    .+)*/mg;
            var match = deviceSectionRegex.exec(rawDevices);
            var matches = [];
            // make an entry for each sdk version
            while (match !== null) {
                matches.push(match);
                match = deviceSectionRegex.exec(rawDevices);
            }
            if (matches.length < 1) {
                errors.fail('Could not find device section. ' + match);
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
                    var lineRegex = /^    ([^\(]+) \(([^\)]+)\) \(([^\)]+)\)( \(([^\)]+)\))*/;
                    var lineMatch = lineRegex.exec(line);
                    if (lineMatch === null) {
                        errors.fail('Could not match line. ' + line);
                    }
                    var available = lineMatch[4];
                    if (available === null || available === undefined) {
                        devices.push({
                            name: lineMatch[1],
                            id: lineMatch[2],
                            fullId: "com.apple.CoreSimulator.SimDeviceType." + lineMatch[1],
                            runtimeVersion: sdk,
                            state: lineMatch[3]
                        });
                    }
                }
            }
            return devices;
        }).future()();
    };
    Simctl.prototype.simctlExec = function (command, args, opts) {
        args = ["simctl", command].concat(args);
        return childProcess.spawn("xcrun", args, opts);
    };
    return Simctl;
})();
exports.Simctl = Simctl;
//# sourceMappingURL=simctl.js.map