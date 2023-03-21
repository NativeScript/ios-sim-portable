import * as fs from "fs";
import * as path from "path";
import * as errors from "./errors";
import * as options from "./options";

export class CommandExecutor implements ICommandExecutor {
  public execute(): void {
    var commandName = this.getCommandName();
    var commandArguments = this.getCommandArguments();

    return this.executeCore(commandName, commandArguments);
  }

  private executeCore(commandName: string, commandArguments: string[]): void {
    try {
      let filePath = path.join(__dirname, "commands", commandName + ".js");
      if (fs.existsSync(filePath)) {
        var command: ICommand = new (require(filePath).Command)();
        if (!command) {
          errors.fail("Unable to resolve commandName %s", commandName);
        }

        command.execute(commandArguments);
      }
    } catch (e) {
      if (options.debug) {
        throw e;
      } else {
        console.log("\x1B[31;1m" + e.message + "\x1B[0m");
      }
    }
  }

  private getCommandArguments(): string[] {
    var remaining = options._;
    return remaining.length > 1 ? remaining.slice(1) : [];
  }

  private getCommandName(): string {
    var remaining = options._;
    return remaining.length > 0 ? remaining[0].toLowerCase() : "help";
  }
}
