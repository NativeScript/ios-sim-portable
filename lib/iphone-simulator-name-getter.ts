///<reference path="./.d.ts"/>
"use strict";
import * as options from "./options";

export abstract class IPhoneSimulatorNameGetter implements INameGetter {
	private _simulatorName: string;

	public defaultDeviceIdentifier: string;

	public getSimulatorName(deviceName?: string): string {
		if (!this._simulatorName) {
			this._simulatorName = options.device || deviceName || this.defaultDeviceIdentifier;
		}

		return this._simulatorName;
	}
}