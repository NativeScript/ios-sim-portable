import iphoneSimulatorLibPath = require("./../iphone-simulator");
import options = require("../options");

export class Command implements ICommand {
	public execute(args: string[]): Promise<string> {
		var iphoneSimulator = new iphoneSimulatorLibPath.iPhoneSimulator();
		return iphoneSimulator.run(args[0], args[1], options);
	}
}