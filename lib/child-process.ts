///<reference path="./.d.ts"/>
"use strict";

import * as child_process from "child_process";
import * as errors from "./errors";
import Future = require("fibers/future");
import * as util from "util";

export function exec(command: string, opts?: any): IFuture<any> {
	var future = new Future<any>();

	child_process.exec(command, (error: Error, stdout: NodeBuffer, stderr: NodeBuffer) => {
		if(error) {
			if (opts && opts.skipError) {
				future.return(error);
			} else {
				future.throw(new Error(`Error ${error.message} while executing ${command}.`));
			}
		} else {
			future.return(stdout ? stdout.toString() : "");
		}
	});

	return future;
}

export function spawn(command: string, args: string[], opts?: any): IFuture<string> {
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
		var exitCode = typeof arg === 'number' ? arg : arg && arg.code;
		if(exitCode === 0) {
			future.return(capturedOut ? capturedOut.trim() : null);
		} else {
			if (opts && opts.skipError) {
				future.return(capturedErr);
			} else {
				future.throw(new Error(util.format("Command %s with arguments %s failed with exit code %s. Error output:\n %s", command, args.join(" "), exitCode, capturedErr)));
			}
		}
	});

	return future;
}