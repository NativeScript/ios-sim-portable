///<reference path="./.d.ts"/>
"use strict";
var child_process = require("child_process");
var Future = require("fibers/future");
var util = require("util");
function exec(command, opts) {
    var future = new Future();
    child_process.exec(command, function (error, stdout, stderr) {
        if (error) {
            if (opts && opts.skipError) {
                future.return(error);
            }
            else {
                future.throw(new Error("Error " + error.message + " while executing " + command + "."));
            }
        }
        else {
            future.return(stdout ? stdout.toString() : "");
        }
    });
    return future;
}
exports.exec = exec;
function spawn(command, args, opts) {
    var future = new Future();
    var capturedOut = "";
    var capturedErr = "";
    var childProcess = child_process.spawn(command, args);
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
        var exitCode = typeof arg === 'number' ? arg : arg && arg.code;
        if (exitCode === 0) {
            future.return(capturedOut ? capturedOut.trim() : null);
        }
        else {
            if (opts && opts.skipError) {
                future.return(capturedErr);
            }
            else {
                future.throw(new Error(util.format("Command %s with arguments %s failed with exit code %s. Error output:\n %s", command, args.join(" "), exitCode, capturedErr)));
            }
        }
    });
    return future;
}
exports.spawn = spawn;
//# sourceMappingURL=child-process.js.map