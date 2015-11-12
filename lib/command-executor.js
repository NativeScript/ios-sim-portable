///<reference path="./.d.ts"/>
"use strict";
var fs = require("fs");
var path = require("path");
require("colors");
var errors = require("./errors");
var options = require("./options");
var CommandExecutor = (function () {
    function CommandExecutor() {
    }
    CommandExecutor.prototype.execute = function () {
        var commandName = this.getCommandName();
        var commandArguments = this.getCommandArguments();
        return this.executeCore(commandName, commandArguments);
    };
    CommandExecutor.prototype.executeCore = function (commandName, commandArguments) {
        return (function () {
            try {
                var filePath = path.join(__dirname, "commands", commandName + ".js");
                if (fs.existsSync(filePath)) {
                    var command = new (require(filePath).Command)();
                    if (!command) {
                        errors.fail("Unable to resolve commandName %s", commandName);
                    }
                    command.execute(commandArguments).wait();
                }
            }
            catch (e) {
                if (options.debug) {
                    throw e;
                }
                else {
                    console.log("\x1B[31;1m" + e.message + "\x1B[0m");
                }
            }
        }).future()();
    };
    CommandExecutor.prototype.getCommandArguments = function () {
        var remaining = options._;
        return remaining.length > 1 ? remaining.slice(1) : [];
    };
    CommandExecutor.prototype.getCommandName = function () {
        var remaining = options._;
        return remaining.length > 0 ? remaining[0].toLowerCase() : "help";
    };
    return CommandExecutor;
})();
exports.CommandExecutor = CommandExecutor;
//# sourceMappingURL=command-executor.js.map