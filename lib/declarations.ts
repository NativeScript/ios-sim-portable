///<reference path="./.d.ts"/>
"use strict";

interface IiPhoneSimulator {
	run(appName: string): IFuture<void>;
}

interface ICommand {
	execute(args: string[]): IFuture<void>;
}

interface ICommandExecutor {
	execute(): IFuture<void>;
}