///<reference path=".././.d.ts"/>
"use strict";
import iphoneSimulatorLibPath = require("./../iphone-simulator");

export class Command implements ICommand {
	public execute(args: string[]): Promise<void> {
		var iphoneSimulator = new iphoneSimulatorLibPath.iPhoneSimulator();
		return iphoneSimulator.printDeviceTypes();
	}
}
