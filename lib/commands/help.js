///<reference path=".././.d.ts"/>
"use strict";
var fs = require("fs");
var path = require("path");
var util = require("util");

var Command = (function () {
    function Command() {
    }
    Command.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var topic = (args[0] || "").toLowerCase();
            if (topic === "help") {
                topic = "";
            }

            var helpContent = fs.readFileSync(path.join(__dirname, "../../resources/help.txt")).toString();

            var pattern = util.format("--\\[%s\\]--((.|[\\r\\n])+?)--\\[/\\]--", _this.escape(topic));
            var regex = new RegExp(pattern);
            var match = regex.exec(helpContent);
            if (match) {
                var helpText = match[1].trim();
                console.log(helpText);
            }
        }).future()();
    };

    Command.prototype.escape = function (s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };
    return Command;
})();
exports.Command = Command;
//# sourceMappingURL=help.js.map
