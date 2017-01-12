module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		ts: {
			options: grunt.file.readJSON("tsconfig.json").compilerOptions,
			devlib: {
				src: ["lib/**/*.ts"],
				reference: "lib/.d.ts"
			},
			release_build: {
				src: ["lib/**/*.ts"],
				reference: "lib/.d.ts",
				options: {
					sourceMap: false,
					removeComments: true
				}
			}
		},

		shell: {
			options: {
				stdout: true,
				stderr: true
			},

			build_package: {
				command: "npm pack"
			}
		},

		clean: {
			src: ["lib/**/*.js*", "*.tgz"]
		}
	});

	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-ts");
	grunt.loadNpmTasks('grunt-shell');

	grunt.registerTask("remove_prepublish_script", function () {
		var packageJson = grunt.file.readJSON("package.json");
		delete packageJson.scripts.prepublish;
		grunt.file.write("package.json", JSON.stringify(packageJson, null, "  "));
	});

	grunt.registerTask("pack", [
		"clean",
		"remove_prepublish_script",
		"ts:release_build",
		"shell:build_package"
	]);

	grunt.registerTask("default", "ts:devlib");
}