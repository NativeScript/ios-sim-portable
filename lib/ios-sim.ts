///<reference path="./.d.ts"/>
"use strict";
global._ = require("lodash");

import Fiber = require("fibers");
import Future = require("fibers/future");

import commandExecutorLibPath = require("./command-executor");

var fiber = Fiber(() => {
	var commandExecutor: ICommandExecutor = new commandExecutorLibPath.CommandExecutor();
	commandExecutor.execute().wait();
	Future.assertNoFutureLeftBehind();
});

fiber.run();

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
			let libraryPath = require("./simctl");
			let obj = new libraryPath.Simctl()
			let result = obj.getAppContainer.apply(obj, args).wait();
			return result;
		}
	}
});


module.exports = global.publicApi;
