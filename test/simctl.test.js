const test = require("node:test");
const assert = require("node:assert");
const { compareVersions, parseAppPid, parseDevices } = require("../lib/simctl");

const device = (name, udid, state = "Shutdown", isAvailable = true) => ({
  name,
  udid,
  state,
  isAvailable,
});
const list = (devices) => JSON.stringify({ devices });
const key = (runtime) => `com.apple.CoreSimulator.SimRuntime.${runtime}`;

test("parseDevices maps simctl's JSON to devices", () => {
  assert.deepStrictEqual(
    parseDevices(list({ [key("iOS-26-2")]: [device("iPad Pro (9.7 inch)", "A", "Booted")] })),
    [
      {
        name: "iPad Pro (9.7 inch)",
        id: "A",
        fullId: "com.apple.CoreSimulator.SimDeviceType.iPad Pro (9.7 inch)",
        runtimeVersion: "26.2",
        state: "Booted",
        platform: "iOS",
      },
    ]
  );
});

test("parseDevices names visionOS by its marketing name and keeps patch versions", () => {
  const devices = parseDevices(
    list({
      [key("xrOS-2-0")]: [device("Apple Vision Pro", "V")],
      [key("iOS-18-3-1")]: [device("iPhone 16", "I")],
    })
  );
  assert.deepStrictEqual(
    devices.map((d) => [d.platform, d.runtimeVersion]),
    [
      ["iOS", "18.3.1"],
      ["visionOS", "2.0"],
    ]
  );
});

test("parseDevices leaves out unavailable devices and unsupported platforms", () => {
  const devices = parseDevices(
    list({
      [key("iOS-26-2")]: [device("iPhone", "A"), device("Broken", "B", "Shutdown", false)],
      [key("watchOS-11-0")]: [device("Apple Watch", "C")],
    })
  );
  assert.deepStrictEqual(devices.map((d) => d.id), ["A"]);
});

test("parseDevices orders runtimes by version rather than as text", () => {
  const devices = parseDevices(
    list({
      [key("iOS-9-3")]: [device("Old", "O")],
      [key("iOS-26-2")]: [device("New", "N")],
      [key("iOS-18-6")]: [device("Mid", "M")],
    })
  );
  assert.deepStrictEqual(devices.map((d) => d.id), ["O", "M", "N"]);
});

test("parseDevices copes with no simulators", () => {
  assert.deepStrictEqual(parseDevices(list({})), []);
});

test("compareVersions compares numerically", () => {
  assert.ok(compareVersions("9.3", "26.2") < 0);
  assert.ok(compareVersions("18.3.1", "18.3") > 0);
  assert.strictEqual(compareVersions("18.0", "18"), 0);
});

test("parseAppPid only matches the exact bundle id of a running app", () => {
  const output = [
    "PID\tStatus\tLabel",
    "123\t0\tUIKitApplication:org.example.app2[a1b2][rb-legacy]",
    "456\t0\tUIKitApplication:org.example.app[c3d4][rb-legacy]",
    "-\t0\tUIKitApplication:org.example.stopped[e5f6][rb-legacy]",
  ].join("\n");

  assert.strictEqual(parseAppPid(output, "org.example.app"), 456);
  assert.strictEqual(parseAppPid(output, "org.example.stopped"), null);
  assert.strictEqual(parseAppPid(output, "org.example"), null);
});
