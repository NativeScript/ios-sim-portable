import commandExecutorLibPath = require("./command-executor");

var commandExecutor: ICommandExecutor = new commandExecutorLibPath.CommandExecutor();
commandExecutor.execute();
