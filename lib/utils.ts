///<reference path="./.d.ts"/>
"use strict";

import * as Fiber from "fibers";

export function stringify(arr: string[], delimiter?: string): string {
	delimiter = delimiter || ", ";
	return arr.join(delimiter);
}

export function sleep(ms: number): void {
	let fiber = Fiber.current;
	setTimeout(() => fiber.run(), ms);
	Fiber.yield();
}