///<reference path="./.d.ts"/>
"use strict";

import Future = require("fibers/future");
import util = require("util");
require("colors");

import errors = require("./errors");
import options = require("./options");

export class CommandExecutor implements ICommandExecutor {

	public execute(): IFuture<void> {
		var commandName = this.getCommandName();
		var commandArguments = this.getCommandArguments();

		return this.executeCore(commandName, commandArguments);
	}

	private executeCore(commandName: string, commandArguments: string[]): IFuture<void> {
		return (() => {
			try {
				var command: ICommand = new (require("./commands/" + commandName).Command)();
				if(!command) {
					errors.fail("Unable to resolve commandName %s", commandName);
				}

				command.execute(commandArguments).wait();
			} catch(e) {
				if(options.debug) {
					throw e;
				} else {
					console.log( "\x1B[31;1m" + e.message + "\x1B[0m");
				}
			}
		}).future<void>()();
	}

	private getCommandArguments(): string[] {
		var remaining = options._;
		return remaining.length > 1 ? remaining.slice(1): [];
	}

	private getCommandName(): string {
		var remaining = options._;
		return remaining.length > 0 ? remaining[0].toLowerCase() : "help";
	}
}