import assert from "node:assert/strict";
import test from "node:test";
import {
  computeRequirementsProgress,
  normalizeGroupLabel,
  totalWeeklyMinutes,
} from "../src/lib/timetable/requirements.ts";

const requirement = {
  id: "req-1",
  courseId: "course-1",
  sessionType: "td",
  groupLabel: "Groupe A",
  sessionsPerWeek: 2,
  durationMinutes: 90,
};

test("compte les besoins sans aucune séance", () => {
  const progress = computeRequirementsProgress([requirement], []);

  assert.equal(progress.items.length, 1);
  assert.equal(progress.items[0].placed, 0);
  assert.equal(progress.items[0].remaining, 2);
  assert.equal(progress.totalWeeklyMinutes, 180);
  assert.equal(progress.placedWeeklyMinutes, 0);
  assert.equal(progress.remainingWeeklyMinutes, 180);
});

test("compte les séances partiellement placées", () => {
  const progress = computeRequirementsProgress(
    [requirement],
    [
      {
        courseId: "course-1",
        sessionType: "td",
        groupLabel: "Groupe A",
      },
    ],
  );

  assert.equal(progress.items[0].placed, 1);
  assert.equal(progress.items[0].remaining, 1);
  assert.equal(progress.placedWeeklyMinutes, 90);
  assert.equal(progress.remainingWeeklyMinutes, 90);
});

test("ne rend jamais le reste négatif en cas de sur-placement", () => {
  const progress = computeRequirementsProgress(
    [requirement],
    [
      {
        courseId: "course-1",
        sessionType: "td",
        groupLabel: "Groupe A",
      },
      {
        courseId: "course-1",
        sessionType: "td",
        groupLabel: "Groupe A",
      },
      {
        courseId: "course-1",
        sessionType: "td",
        groupLabel: "Groupe A",
      },
    ],
  );

  assert.equal(progress.items[0].placed, 3);
  assert.equal(progress.items[0].remaining, 0);
  assert.equal(progress.placedWeeklyMinutes, 180);
  assert.equal(progress.remainingWeeklyMinutes, 0);
});

test("compare les groupes sans tenir compte de la casse et des espaces", () => {
  assert.equal(normalizeGroupLabel("  Groupe A "), "groupe a");

  const progress = computeRequirementsProgress(
    [requirement],
    [
      {
        courseId: "course-1",
        sessionType: "TD",
        groupLabel: "groupe a",
      },
    ],
  );

  assert.equal(progress.items[0].placed, 1);
  assert.equal(progress.items[0].remaining, 1);
});

test("gère une liste de besoins vide", () => {
  const progress = computeRequirementsProgress([], []);

  assert.deepEqual(progress.items, []);
  assert.equal(progress.totalWeeklyMinutes, 0);
  assert.equal(progress.placedWeeklyMinutes, 0);
  assert.equal(progress.remainingWeeklyMinutes, 0);
  assert.equal(totalWeeklyMinutes([]), 0);
});

test("calcule le total hebdomadaire de plusieurs besoins", () => {
  assert.equal(
    totalWeeklyMinutes([
      requirement,
      {
        id: "req-2",
        courseId: "course-2",
        sessionType: "cours",
        groupLabel: null,
        sessionsPerWeek: 1,
        durationMinutes: 120,
      },
    ]),
    300,
  );
});
