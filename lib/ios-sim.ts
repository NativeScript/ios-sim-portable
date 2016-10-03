///<reference path="./.d.ts"/>
"use strict";

import * as _ from "lodash";

import Fiber = require("fibers");
import Future = require("fibers/future");

import commandExecutorLibPath = require("./command-executor");

var fiber = Fiber(() => {
	var commandExecutor: ICommandExecutor = new commandExecutorLibPath.CommandExecutor();
	commandExecutor.execute().wait();
	Future.assertNoFutureLeftBehind();
});

fiber.run();

function getSimulator(): IFuture<ISimulator> {
	let libraryPath = require("./iphone-simulator");
	let obj = new libraryPath.iPhoneSimulator();
	return obj.createSimulator();
}

global.publicApi = {};

Object.defineProperty(global.publicApi, "getRunningSimulator", {
	get: () => {
		return (...args: any[]) => {
			let future = new Future<any>();
			let libraryPath = require("./iphone-simulator-xcode-7");
			let simulator = new libraryPath.XCode7Simulator();
			let repeatCount = 30;
			let timer = setInterval(() => {
				Fiber(() => {
					let result = simulator.getBootedDevice.apply(simulator, args).wait();
					if( (result || !repeatCount) && !future.isResolved()) {
						clearInterval(timer);
						future.return(result);
					}
					repeatCount--;
				}).run();
			}, 500);
			return future.wait();
		}
	}
});

Object.defineProperty(global.publicApi, "getApplicationPath", {
	get: () => {
		return (...args: any[]) => {
			let simulator = getSimulator().wait();
			let result = simulator.getApplicationPath.apply(simulator, args).wait();
			return result;
		}
	}
});

Object.defineProperty(global.publicApi, "getInstalledApplications", {
	get: () => {
		return (...args: any[]) => {
			let simulator = getSimulator().wait();
			let installedApplications: IApplication[] = simulator.getInstalledApplications.apply(simulator, args).wait();
			let result = _.map(installedApplications, application => application.appIdentifier);
			return result;
		}
	}
});

["installApplication",
 "uninstallApplication",
 "startApplication",
 "stopApplication",
 "printDeviceLog",
 "getDeviceLogProcess",
 "startSimulator",
 "getSimulatorName"].forEach(methodName => {
	Object.defineProperty(global.publicApi, methodName, {
		get: () => {
			return (...args: any[]) => {
				let simulator: any = getSimulator().wait();
				return simulator[methodName].apply(simulator, args);
			}
		}
	});
})

module.exports = global.publicApi;
