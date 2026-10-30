const test = require("node:test");
const assert = require("node:assert");
const { XCodeSimctlSimulator } = require("../lib/iphone-simulator-xcode-simctl");

const iOS = (name, id, runtimeVersion, state = "Shutdown") => ({
  name,
  id,
  fullId: `type.${name}`,
  runtimeVersion,
  state,
  platform: "iOS",
});

let nextApp = 0;
function setup(devices = [], overrides = {}) {
  const calls = [];
  const simulator = new XCodeSimctlSimulator();
  simulator.simctl = {
    getDevices: async () => devices,
    launch: async (id) => {
      calls.push(`launch ${id}`);
      return `app: ${calls.length}`;
    },
    terminate: async (id) => {
      calls.push(`terminate ${id}`);
    },
    getAppPid: async () => null,
    bootAndWait: async (id) => {
      calls.push(`boot ${id}`);
    },
    notifyPost: async (id, name) => {
      calls.push(`notify ${id} ${name}`);
    },
    ...overrides,
  };
  simulator.isSimulatorAppRunning = async () => true;
  return { simulator, calls, app: `org.example.app${nextApp++}` };
}

test("a booted device is left alone", async () => {
  const booted = iOS("iPhone", "A", "26.2", "Booted");
  const { simulator, calls } = setup([booted]);
  await simulator.startSimulator({ device: "A" }, booted);
  assert.deepStrictEqual(calls, []);
});

test("the device named in the options is the one that boots", async () => {
  const { simulator, calls } = setup([iOS("iPhone", "A", "26.2"), iOS("iPad", "B", "26.2")]);
  await simulator.startSimulator({ device: "iPad" });
  assert.deepStrictEqual(calls, ["boot B"]);
});

test("a boot failure reaches the caller", async () => {
  const { simulator } = setup([iOS("iPhone", "A", "26.2")], {
    bootAndWait: async () => {
      throw new Error("boot failed");
    },
  });
  await assert.rejects(simulator.startSimulator({ device: "A" }), /boot failed/);
});

test("an unknown device is refused", async () => {
  const { simulator } = setup([iOS("iPhone", "A", "26.2")]);
  await assert.rejects(simulator.startSimulator({ device: "nope" }));
});

test("the default is the iPhone on the newest runtime", async () => {
  const { simulator, calls } = setup([
    iOS("iPhone Old", "O", "9.3"),
    iOS("iPhone New", "N", "26.2"),
    iOS("iPhone Mid", "M", "18.6"),
    iOS("iPad Newest", "P", "27.0"),
    { ...iOS("Apple TV", "T", "99.0"), platform: "tvOS" },
  ]);
  await simulator.startSimulator({});
  assert.deepStrictEqual(calls, ["boot N"]);
});

test("a booted device is preferred over the default", async () => {
  const { simulator, calls } = setup([iOS("iPhone", "N", "26.2"), iOS("iPad", "B", "18.6", "Booted")]);
  await simulator.startSimulator({});
  assert.deepStrictEqual(calls, []);
});

test("starting an app that was just started returns its launch instead of launching again", async () => {
  const { simulator, calls, app } = setup();
  const first = await simulator.startApplication("A", app, {});
  const second = await simulator.startApplication("A", app, {});
  assert.strictEqual(second, first);
  assert.deepStrictEqual(calls, ["launch A"]);
});

test("a failed launch can be retried straight away", async () => {
  let attempts = 0;
  const { simulator, app } = setup([], {
    launch: async () => {
      if (!attempts++) {
        throw new Error("launch failed");
      }
      return "app: 1";
    },
  });
  await assert.rejects(simulator.startApplication("A", app, {}), /launch failed/);
  assert.strictEqual(await simulator.startApplication("A", app, {}), "app: 1");
});

test("an app that is stopped starts again", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { simulator, calls, app } = setup();
  await simulator.startApplication("A", app, {});
  const stopping = simulator.stopApplication("A", app);
  t.mock.timers.tick(3000);
  await stopping;
  await simulator.startApplication("A", app, {});
  assert.deepStrictEqual(calls, ["launch A", "terminate A", "launch A"]);
});

test("stopping waits until the app has had time to start", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { simulator, calls, app } = setup();
  await simulator.startApplication("A", app, {});
  const stopping = simulator.stopApplication("A", app);
  await Promise.resolve();
  t.mock.timers.tick(2900);
  await Promise.resolve();
  assert.ok(!calls.includes("terminate A"));
  t.mock.timers.tick(100);
  await stopping;
  assert.ok(calls.includes("terminate A"));
});

test("concurrent stops terminate once", async () => {
  const { simulator, calls, app } = setup();
  await Promise.all([simulator.stopApplication("A", app), simulator.stopApplication("A", app)]);
  assert.deepStrictEqual(calls, ["terminate A"]);
});

test("an app that isn't running needs no kill", async () => {
  let looked = false;
  const { simulator, app } = setup([], {
    terminate: async () => {
      throw new Error("failed. found nothing to terminate");
    },
    getAppPid: async () => {
      looked = true;
    },
  });
  await simulator.stopApplication("A", app);
  assert.strictEqual(looked, false);
});

test("an app simctl can't terminate is killed by its own pid", async (t) => {
  const kill = t.mock.method(process, "kill", () => true);
  const { simulator, app } = setup([], {
    terminate: async () => {
      throw new Error("simctl failed");
    },
    getAppPid: async () => 4242,
  });
  await simulator.stopApplication("A", app);
  assert.deepStrictEqual(kill.mock.calls[0].arguments, [4242, "SIGKILL"]);
});

test("a notification goes straight to simctl", async () => {
  const { simulator, calls } = setup([]);
  await simulator.sendNotification("hello", "A");
  assert.deepStrictEqual(calls, ["notify A hello"]);
});
