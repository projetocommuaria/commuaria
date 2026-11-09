import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { replaceCityRows, rowBelongsToCity, rowsForCity } from "./cityScopedRows";

type TestRow = { id: string; city_id?: string | null };

describe("tenant-scoped local rows", () => {
  it("filters by explicit city and does not infer a fallback implicitly", () => {
    const rows: TestRow[] = [
      { id: "arau-1", city_id: "araucaria-pr" },
      { id: "cur-1", city_id: "curitiba-pr" },
      { id: "legacy-1" },
    ];

    assert.deepEqual(rowsForCity(rows, "curitiba-pr"), [{ id: "cur-1", city_id: "curitiba-pr" }]);
    assert.deepEqual(rowsForCity(rows, "araucaria-pr"), [{ id: "arau-1", city_id: "araucaria-pr" }]);
    assert.deepEqual(rowsForCity(rows, "araucaria-pr", "araucaria-pr"), [
      { id: "arau-1", city_id: "araucaria-pr" },
      { id: "legacy-1" },
    ]);
    const unscopedRow: TestRow = { id: "legacy-2" };
    assert.equal(rowBelongsToCity(unscopedRow, "curitiba-pr", "araucaria-pr"), false);
  });

  it("replaces one city's cache without deleting another city's records", () => {
    const existing: TestRow[] = [
      { id: "arau-old", city_id: "araucaria-pr" },
      { id: "legacy-arau" },
      { id: "curitiba-old", city_id: "curitiba-pr" },
    ];
    const refreshed: TestRow[] = [
      { id: "arau-new", city_id: "araucaria-pr" },
      { id: "legacy-refreshed" },
      { id: "wrong-city", city_id: "curitiba-pr" },
    ];

    const result = replaceCityRows(existing, refreshed, "araucaria-pr", "araucaria-pr");

    assert.deepEqual(result, [
      { id: "curitiba-old", city_id: "curitiba-pr" },
      { id: "arau-new", city_id: "araucaria-pr" },
      { id: "legacy-refreshed", city_id: "araucaria-pr" },
    ]);
  });

  it("preserves the input unchanged when no target city is available", () => {
    const existing: TestRow[] = [{ id: "legacy-row" }];
    assert.deepEqual(replaceCityRows(existing, [], null, "araucaria-pr"), existing);
  });
});
