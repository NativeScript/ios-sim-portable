ios-sim-portable
================

The ios-sim-portable is a command-line utility written in Node.js that launches an [iOS application bundle (.app)][5] in the Xcode [iOS Simulator][4].

* [System Requirements](#system-requirements)
* [Installation](#installation)
* [Usage](#usage)
* [License](#license)
* [Related npm Packages](#related-npm-packages)

System Requirements
===================

* OS X 10.9.4 or later
* Node.js 0.10.26 or later
* Xcode 5.0 or later
* Command Line Tools for Xcode, compatible with your versions of Xcode and OS X
* iOS 7.0 SDK or later 

[Back to Top][1]

Installation
============

To install ios-sim-portable, run the following command.

```bash
npm i -g ios-sim-portable
```

To update ios-sim-portable, run the following command.

```bash
npm update -g ios-sim-portable
```

To uninstall ios-sim-portable, run the following command.

```bash
npm uninstall -g ios-sim-portable
```

[Back to Top][1]

Usage
=====

```bash
$ ios-sim-portable <command> [parameters] [--options <values>]
$ isim <command> [parameters] [--options <values>]

General commands:
	help <command>       Shows additional information about the commands in this list.
	launch <full path>   Launches the application bundle at the specified path in the iOS Simulator.
	device-types         Lists the available device types for the current Xcode version.
	sdks                 Lists the available iOS SDK versions.
	notify-post          Post a darwin notification on a device.

For more information about each command, run 
$ isim help <command>
or
$ isim <command> --help

```

[Back to Top][1]

License
=======

This software is licensed under the Apache 2.0 license, quoted <a href="LICENSE" target="_blank">here</a>.

[Back to Top][1]

Related npm Packages
================

Both the Telerik AppBuilder CLI (`appbuilder`) and the NativeScript CLI (`nativescript`) rely on ios-sim-portable to load projects in the iOS Simulator.

The [Telerik AppBuilder CLI][2] lets you build, test, deploy, and publish hybrid mobile apps for iOS, Android, and Windows Phone 8 from your favorite IDE or code editor.

The [NativeScript CLI][3] lets you create, build, and deploy Telerik NativeScript-based projects on iOS and Android devices.

[Back to Top][1]

[1]: #ios-sim-portable
[2]: https://www.npmjs.org/package/appbuilder
[3]: https://www.npmjs.org/package/nativescript
[4]: https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/iOS_Simulator_Guide/Introduction/Introduction.html
[5]: https://developer.apple.com/library/ios/documentation/CoreFoundation/Conceptual/CFBundles/AboutBundles/AboutBundles.html#//apple_ref/doc/uid/10000123i-CH100-SW1