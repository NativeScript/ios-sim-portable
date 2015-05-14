///<reference path=".././.d.ts"/>
"use strict";

import Future = require("fibers/future");
import iphoneSimulatorLibPath = require("./../iphone-simulator");

export class Command implements ICommand {
	public execute(args: string[]): IFuture<void> {
		var iphoneSimulator = new iphoneSimulatorLibPath.iPhoneSimulator();
		return iphoneSimulator.sendNotification(args[0]);
	}
}