const assert = require('assert');
const fs = require('fs');
const childProcess = require('../lib/child-process');
const xcode = require('../lib/xcode');
const common = require('../lib/iphone-simulator-common');
const { XCodeSimctlSimulator } = require('../lib/iphone-simulator-xcode-simctl');

(async () => {
  const originals = [fs.existsSync, xcode.getPathFromXcodeSelect, childProcess.spawn, common.startSimulator];
  const calls = [];
  try {
    xcode.getPathFromXcodeSelect = () => '/Xcode With Spaces.app/Contents/Developer';
    childProcess.spawn = async (command, args) => calls.push([command, args]);
    fs.existsSync = () => true;
    await common.startSimulator(26, 'device-id');
    assert.deepStrictEqual(calls.pop(), ['open', ['/Xcode With Spaces.app/Contents/Developer/Applications/Simulator.app', '--args', '-CurrentDeviceUDID', 'device-id']]);
    fs.existsSync = () => false;
    await common.startSimulator(27, 'device-id');
    assert.deepStrictEqual(calls.pop(), ['xcrun', ['simctl', 'bootstatus', 'device-id', '-b']]);
    await assert.rejects(common.startSimulator(27), /device identifier is required/);
    childProcess.spawn = async () => { throw new Error('boot failed'); };
    await assert.rejects(common.startSimulator(27, 'device-id'), /boot failed/);

    const simulator = new XCodeSimctlSimulator();
    const device = { id: 'device-id', state: 'Shutdown', runtimeVersion: '27.0', fullId: 'full-id' };
    simulator.getDeviceToRun = async () => device;
    simulator.verifyDevice = async () => {};
    simulator.isDeviceBooted = value => value.state === 'Booted';
    simulator._XCodeMajorVersion = 27;
    simulator.isSimulatorAppRunning = () => false;
    common.startSimulator = async (version, id) => calls.push(['start', version, id]);
    await simulator.startSimulator({});
    assert.deepStrictEqual(calls.pop(), ['start', 27, 'device-id']);
    simulator.isSimulatorAppRunning = () => true;
    simulator.simctl = { boot: async id => calls.push(['boot', id]) };
    await simulator.startSimulator({}, device);
    assert.deepStrictEqual(calls.splice(0), [['boot', 'device-id'], ['start', 27, 'device-id']]);
    device.state = 'Booted';
    await simulator.startSimulator({}, device);
    assert.strictEqual(calls.length, 0);
    device.state = 'Shutdown';
    simulator.simctl.boot = async () => { throw new Error('boot failed'); };
    await assert.rejects(simulator.startSimulator({}, device), /boot failed/);
    simulator.startSimulator = async () => { throw new Error('not ready'); };
    simulator.installApplication = async () => { throw new Error('installed too soon'); };
    await assert.rejects(simulator.run('/app', 'app-id', {}), /not ready/);
    console.log('Simulator launch regression checks passed.');
  } finally {
    [fs.existsSync, xcode.getPathFromXcodeSelect, childProcess.spawn, common.startSimulator] = originals;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
