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


