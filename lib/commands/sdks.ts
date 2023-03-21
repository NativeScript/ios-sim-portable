import { iPhoneSimulator } from "./../iphone-simulator";

export class Command implements ICommand {
  public execute(args: string[]): Promise<void> {
    var iphoneSimulator = new iPhoneSimulator();
    return iphoneSimulator.printSDKS();
  }
}
