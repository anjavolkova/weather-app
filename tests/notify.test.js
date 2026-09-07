import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAlerts } from "../src/notify.js";

test("checkAlerts: flags a Kp storm at or above the threshold", () => {
  const alerts = checkAlerts({ kpIndex: 5, pressureHpa: 1010 }, null);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "kp-storm");
});

test("checkAlerts: no alert below the Kp storm threshold", () => {
  const alerts = checkAlerts({ kpIndex: 4.7, pressureHpa: 1010 }, null);
  assert.equal(alerts.length, 0);
});

test("checkAlerts: flags a sharp pressure drop vs the prior reading", () => {
  const alerts = checkAlerts({ kpIndex: 1, pressureHpa: 1005 }, { pressureHpa: 1009 });
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "pressure-drop");
});

test("checkAlerts: no pressure alert for a gentle change", () => {
  const alerts = checkAlerts({ kpIndex: 1, pressureHpa: 1007.5 }, { pressureHpa: 1009 });
  assert.equal(alerts.length, 0);
});

test("checkAlerts: can report both a storm and a sharp drop together", () => {
  const alerts = checkAlerts({ kpIndex: 6, pressureHpa: 1000 }, { pressureHpa: 1009 });
  assert.equal(alerts.length, 2);
});
