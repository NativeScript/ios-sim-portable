///<reference path="./.d.ts"/>
"use strict";
import * as options from "./options";

export abstract class IPhoneSimulatorNameGetter implements INameGetter {
	private _simulatorName: string;

	public defaultDeviceIdentifier: string;

	public getSimulatorName(): string {
		if (!this._simulatorName) {
			this._simulatorName = options.device || this.defaultDeviceIdentifier;
		}

		return this._simulatorName;
	}
}