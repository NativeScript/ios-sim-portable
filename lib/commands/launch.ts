import { iPhoneSimulator } from "../iphone-simulator";
import * as options from "../options";

export class Command implements ICommand {
  public execute(args: string[]): Promise<string> {
    var iphoneSimulator = new iPhoneSimulator();
    return iphoneSimulator.run(args[0], args[1], options);
  }
}
