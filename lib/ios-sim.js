///<reference path="./.d.ts"/>
"use strict";
global._ = require("underscore");

var Fiber = require("fibers");
var Future = require("fibers/future");

var commandExecutorLibPath = require("./command-executor");

var fiber = Fiber(function () {
    var commandExecutor = new commandExecutorLibPath.CommandExecutor();
    commandExecutor.execute().wait();
    Future.assertNoFutureLeftBehind();
});

fiber.run();
//# sourceMappingURL=ios-sim.js.map
