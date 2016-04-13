///<reference path="./.d.ts"/>
"use strict";
var childProcess = require("./child-process");
var Future = require("fibers/future");
var fs = require("fs");
var path = require("path");
var xcode = require("./xcode");
var bplistParser = require("bplist-parser");
var plist = require("plist");
var osenv = require("osenv");
var isDeviceLogOperationStarted = false;
var pid;
function getInstalledApplications(deviceId) {
    return (function () {
        var rootApplicationsPath = path.join(osenv.home(), "/Library/Developer/CoreSimulator/Devices/" + deviceId + "/data/Containers/Bundle/Application");
        if (!fs.existsSync(rootApplicationsPath)) {
            rootApplicationsPath = path.join(osenv.home(), "/Library/Developer/CoreSimulator/Devices/" + deviceId + "/data/Applications");
        }
        var applicationGuids = fs.readdirSync(rootApplicationsPath);
        var result = [];
        _.each(applicationGuids, function (applicationGuid) {
            var fullApplicationPath = path.join(rootApplicationsPath, applicationGuid);
            if (fs.statSync(fullApplicationPath).isDirectory()) {
                var applicationDirContents = fs.readdirSync(fullApplicationPath);
                var applicationName = _.find(applicationDirContents, function (fileName) { return path.extname(fileName) === ".app"; });
                var plistFilePath = path.join(fullApplicationPath, applicationName, "Info.plist");
                result.push({
                    guid: applicationGuid,
                    appIdentifier: getBundleIdentifier(plistFilePath).wait(),
                    path: path.join(fullApplicationPath, applicationName)
                });
            }
        });
        return result;
    }).future()();
}
exports.getInstalledApplications = getInstalledApplications;
function printDeviceLog(deviceId, launchResult) {
    if (launchResult) {
        pid = launchResult.split(":")[1].trim();
    }
    if (!isDeviceLogOperationStarted) {
        var logFilePath = path.join(osenv.home(), "Library", "Logs", "CoreSimulator", deviceId, "system.log");
        var childProcess_1 = require("child_process").spawn("tail", ['-f', '-n', '1', logFilePath]);
        if (childProcess_1.stdout) {
            childProcess_1.stdout.on("data", function (data) {
                var dataAsString = data.toString();
                if (pid) {
                    if (dataAsString.indexOf("[" + pid + "]") > -1) {
                        process.stdout.write(dataAsString);
                    }
                }
                else {
                    process.stdout.write(dataAsString);
                }
            });
        }
        if (childProcess_1.stderr) {
            childProcess_1.stderr.on("data", function (data) {
                var dataAsString = data.toString();
                if (pid) {
                    if (dataAsString.indexOf("[" + pid + "]") > -1) {
                        process.stdout.write(dataAsString);
                    }
                }
                else {
                    process.stdout.write(dataAsString);
                }
                process.stdout.write(data.toString());
            });
        }
        isDeviceLogOperationStarted = true;
    }
}
exports.printDeviceLog = printDeviceLog;
function startSimulator(deviceId) {
    return (function () {
        var simulatorPath = path.resolve(xcode.getPathFromXcodeSelect().wait(), "Applications", "Simulator.app");
        var args = [simulatorPath, '--args', '-CurrentDeviceUDID', deviceId];
        childProcess.spawn("open", args).wait();
    }).future()();
}
exports.startSimulator = startSimulator;
function parseFile(plistFilePath) {
    var future = new Future();
    bplistParser.parseFile(plistFilePath, function (err, obj) {
        if (err) {
            future.throw(err);
        }
        else {
            future.return(obj);
        }
    });
    return future;
}
function getBundleIdentifier(plistFilePath) {
    return (function () {
        var plistData;
        try {
            plistData = parseFile(plistFilePath).wait()[0];
        }
        catch (err) {
            var content = fs.readFileSync(plistFilePath).toString();
            plistData = plist.parse(content);
        }
        return plistData && plistData.CFBundleIdentifier;
    }).future()();
}
//# sourceMappingURL=iphone-simulator-common.js.map