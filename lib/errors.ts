///<reference path="./.d.ts"/>
"use strict";

import util = require("util");

export function fail(errorMessage: string, ...args: string[]) {
	args.unshift(errorMessage);
	throw new Error(util.format.apply(null, args));
}
