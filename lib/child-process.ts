///<reference path="./.d.ts"/>
"use strict";

import child_process = require("child_process");
import errors = require("./errors");
import Future = require("fibers/future");
import util = require("util");

export function exec(command: string): IFuture<any> {
	var future = new Future<any>();

	child_process.exec(command, (error: Error, stdout: NodeBuffer, stderr: NodeBuffer) => {
		//console.log(util.format("Executing: %s", command));

		if(error) {
			errors.fail(util.format("Error %s while executing %s.", error.message, command));
		} else {
			future.return(stdout ? stdout.toString() : "");
		}
	});

	return future;
}

export function spawn(command: string, args: string[]): IFuture<string> {
	let future = new Future<string>();
	let capturedOut = "";
	let capturedErr = "";

	let childProcess = child_process.spawn(command, args);

	if(childProcess.stdout) {
		childProcess.stdout.on("data", (data: string) => {
			capturedOut +=  data;
		});
	}

	if(childProcess.stderr) {
		childProcess.stderr.on("data", (data: string) => {
			capturedErr += data;
		});
	}

	childProcess.on("close", (arg: any) => {
		var exitCode = typeof arg == 'number' ? arg : arg && arg.code;
		if(exitCode === 0) {
			future.return(capturedOut ? capturedOut.trim() : null);
		} else {
			future.throw(util.format("Command %s with arguments %s failed with exit code %s. Error output: \n %s", command, args.join(" "), exitCode, capturedErr));
		}
	});

	return future;
}