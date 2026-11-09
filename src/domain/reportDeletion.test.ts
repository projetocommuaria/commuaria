import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addReportDeletionMarker,
  isReportDeletedInCity,
  type ReportDeletionMarker,
} from "./reportDeletion";

describe("tenant-scoped report deletion markers", () => {
  it("treats legacy string markers as Araucária-only", () => {
    const legacy: ReportDeletionMarker[] = ["report-1"];

    assert.equal(isReportDeletedInCity(legacy, "report-1", "araucaria-pr", "araucaria-pr"), true);
    assert.equal(isReportDeletedInCity(legacy, "report-1", "curitiba-pr", "araucaria-pr"), false);
  });

  it("scopes new deletion markers to exactly one municipality", () => {
    const markers: ReportDeletionMarker[] = [{ id: "report-1", city_id: "curitiba-pr" }];

    assert.equal(isReportDeletedInCity(markers, "report-1", "curitiba-pr"), true);
    assert.equal(isReportDeletedInCity(markers, "report-1", "araucaria-pr"), false);
  });

  it("adds an explicit city marker without replacing legacy or other-city markers", () => {
    const existing: ReportDeletionMarker[] = [
      "legacy-araucaria-report",
      { id: "curitiba-report", city_id: "curitiba-pr" },
    ];

    assert.deepEqual(
      addReportDeletionMarker(existing, "new-report", "araucaria-pr", "araucaria-pr"),
      [
        ...existing,
        { id: "new-report", city_id: "araucaria-pr" },
      ],
    );
    assert.deepEqual(
      addReportDeletionMarker(existing, "legacy-araucaria-report", "araucaria-pr", "araucaria-pr"),
      existing,
    );
  });

  it("fails closed when a city id is missing", () => {
    assert.equal(isReportDeletedInCity(["report-1"], "report-1", null, "araucaria-pr"), false);
    assert.deepEqual(addReportDeletionMarker([], "report-1", null, "araucaria-pr"), []);
  });
});
