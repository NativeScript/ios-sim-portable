var fs = require("fs");
var grunt = require("grunt");

var callback = function(err) {};

grunt.cli.tasks = ["ts:devlib"];
grunt.cli(null, callback);
