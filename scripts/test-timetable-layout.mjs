import assert from "node:assert/strict";
import test from "node:test";
import {
  TIMETABLE_DAY_END_MINUTES,
  TIMETABLE_DAY_START_MINUTES,
  layoutDay,
  minutesToTime,
  timeToMinutes,
} from "../src/lib/timetable/layout.ts";

const TOTAL_MINUTES =
  TIMETABLE_DAY_END_MINUTES - TIMETABLE_DAY_START_MINUTES;

function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 0.001,
    `${message} (attendu ${expected}, obtenu ${actual})`,
  );
}

function byId(blocks, id) {
  const block = blocks.find((item) => item.id === id);
  assert.ok(block, `Bloc introuvable : ${id}`);
  return block;
}

test("positionne une séance unique", () => {
  const blocks = layoutDay([
    { id: "a", startTime: "09:00", endTime: "10:00" },
  ]);

  assert.equal(blocks.length, 1);
  const block = blocks[0];
  assert.equal(block.column, 0);
  assert.equal(block.columnCount, 1);
  closeTo(block.top, (60 / TOTAL_MINUTES) * 100, "position verticale");
  closeTo(block.height, (60 / TOTAL_MINUTES) * 100, "hauteur");
});

test("place deux séances consécutives dans la même colonne", () => {
  const blocks = layoutDay([
    { id: "a", startTime: "08:00", endTime: "09:00" },
    { id: "b", startTime: "09:00", endTime: "10:00" },
  ]);

  assert.equal(blocks.length, 2);
  assert.equal(byId(blocks, "a").column, 0);
  assert.equal(byId(blocks, "a").columnCount, 1);
  assert.equal(byId(blocks, "b").column, 0);
  assert.equal(byId(blocks, "b").columnCount, 1);
});

test("affiche côte à côte deux séances qui se chevauchent", () => {
  const blocks = layoutDay([
    { id: "a", startTime: "09:00", endTime: "10:00" },
    { id: "b", startTime: "09:30", endTime: "10:30" },
  ]);

  assert.equal(blocks.length, 2);
  const first = byId(blocks, "a");
  const second = byId(blocks, "b");
  assert.equal(first.columnCount, 2);
  assert.equal(second.columnCount, 2);
  assert.equal(first.column, 0);
  assert.equal(second.column, 1);
});

test("gère une séance qui traverse une ligne horaire", () => {
  const blocks = layoutDay([
    { id: "a", startTime: "08:30", endTime: "10:15" },
  ]);

  assert.equal(blocks.length, 1);
  const block = blocks[0];
  closeTo(block.top, (30 / TOTAL_MINUTES) * 100, "position verticale");
  closeTo(block.height, (105 / TOTAL_MINUTES) * 100, "hauteur");
});

test("ignore les horaires invalides ou hors plage", () => {
  assert.deepEqual(
    layoutDay([
      { id: "a", startTime: "10:00", endTime: "09:00" },
      { id: "b", startTime: "abc", endTime: "10:00" },
      { id: "c", startTime: "25:00", endTime: "26:00" },
      { id: "d", startTime: "07:00", endTime: "08:00" },
      { id: "e", startTime: "19:00", endTime: "20:00" },
    ]),
    [],
  );
});

test("convertit les horaires dans les deux sens", () => {
  assert.equal(timeToMinutes("08:00"), 480);
  assert.equal(timeToMinutes("08:00:00"), 480);
  assert.equal(timeToMinutes("19:00"), 1140);
  assert.equal(timeToMinutes("24:00"), null);
  assert.equal(timeToMinutes("12:60"), null);
  assert.equal(timeToMinutes(""), null);
  assert.equal(minutesToTime(480), "08:00");
  assert.equal(minutesToTime(1140), "19:00");
});
