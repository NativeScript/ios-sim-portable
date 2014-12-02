module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		ts: {
			options: {
				target: 'es5',
				module: 'commonjs',
				sourceMap: true,
				declaration: false,
				removeComments: false,
				noImplicitAny: true
			},
			devlib: {
				src: ["lib/**/*.ts"],
				reference: "lib/.d.ts"
			}
		},

		clean: {
			src: ["lib/**/*.js*", "*.tgz"]
		}
	});

	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-ts");

	grunt.registerTask("default", "ts:devlib");
}