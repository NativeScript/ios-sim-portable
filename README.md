ios-sim-portable
================

The ios-sim-portable is a command-line utility written in Node.js that launches an iOS application (.app) on the iOS Simulator.

* [System Requirements](#system-requirements)
* [Installation](#installation)
* [Usage](#usage)
* [License](#license)
* [Related Packages](#related-packages)

System Requirements
===================

* OS X 10.9.4 or later
* Node.js 0.10.31 or later
* Xcode 5.0 or later
* Command Line Tools for Xcode, compatible with your version of Xcode and your OS X
* iOS 7.0 SDK or later 

[Back to Top][1]

Installation
============

To install ios-sim-portable, run the following command.

```
npm i -g ios-sim-portable
```

To update ios-sim-portable, run the following command.

```
npm update -g ios-sim-portable
```

To uninstall ios-sim-portable, run the following command.

```
npm uninstall -g ios-sim-portable
```

[Back to Top][1]

Usage
=====

```
$ ios-sim-portable <command> [command parameters] [--command <options>]
$ isim <command> [command parameters] [--command <options>]
```

Command | Syntax | Description | Options | Example
--------|--------|---------| ------------|--------
**help**    | `help <command>` | Shows additional information about the commands in this list. | &nbsp; | `$ ios-sim help launch`
**launch**  | `launch <full path> [--exit] [--device]` | Launches the application (.app) at the specified path in the iOS Simulator. | *--exit* - If set, releases the console after the iOS Simulator starts.<br/>*--device* - If set, launches the app in the selected device. Otherwise, launches the app in the default device. To list the available devices, run `$ isim device-types`<br/>*--help* - If set, shows information about the current command. | `$ ios-sim launch /Volumes/HDD/Projects/my-project.app --device iPad-Air --exit`
**device-types** | `device-types` | Lists the available device types for the current Xcode version. | *--help* - If set, shows information about the current command. | `$ isim device-types`
**sdks** | `$ ios-sim sdks` | Lists the available iOS SDK versions. | *--help* - If set, shows information about the current command. | `$ ios-sim sdks`

[Back to Top][1]

License
=======

This software is licensed under the Apache 2.0 license, quoted <a href="LICENSE" target="_blank">here</a>.

[Back to Top][1]

Related Packages
================

Both the Telerik AppBuilder CLI (`appbuilder`) and the NativeScript CLI (`nativescript`) rely on ios-sim-portable to load projects in the iOS Simulator.

The [Telerik AppBuilder CLI][2] lets you build, test, deploy, and publish hybrid mobile apps for iOS, Android, and Windows Phone 8 from your favorite IDE or code editor.

The [NativeScript CLI][3] lets you create, build, and deploy Telerik NativeScript-based projects on iOS and Android devices.

[Back to Top][1]

[1]: #ios-sim-portable
[2]: https://www.npmjs.org/package/appbuilder
[3]: https://www.npmjs.org/package/nativescript