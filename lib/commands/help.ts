///<reference path=".././.d.ts"/>
"use strict";

import fs = require("fs");
import path = require("path");
import util = require("util");

export class Command implements ICommand {
	public execute(args: string[]): IFuture<void> {
		return (() => {
			var topic = (args[0] || "").toLowerCase();
			if (topic === "help") {
				topic = "";
			}

			var helpContent = fs.readFileSync(path.join(__dirname, "../../resources/help.txt")).toString();

			var pattern = util.format("--\\[%s\\]--((.|[\\r\\n])+?)--\\[/\\]--", this.escape(topic));
			var regex = new RegExp(pattern);
			var match = regex.exec(helpContent);
			if (match) {
				var helpText = match[1].trim();
				console.log(helpText);
			}
		}).future<void>()();
	}

	private escape(s: string): string {
		return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}
}