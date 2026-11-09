import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SEEDED_CITIES } from "../data/rmcIbgeCities";
import type { CityItem } from "../types";
import {
  cityFeature,
  getGeoJsonBoundsAndCenter,
  getPointInGeoJson,
  isPointInGeoJson,
} from "./cityGeometry";

describe("municipal GeoJSON helpers", () => {
  it("computes Leaflet bounds and center using GeoJSON longitude-latitude coordinates", () => {
    const feature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [-49.4, -25.5],
          [-49.2, -25.5],
          [-49.2, -25.3],
          [-49.4, -25.3],
          [-49.4, -25.5],
        ]],
      },
    };

    assert.deepEqual(getGeoJsonBoundsAndCenter(feature), {
      bounds: [[-25.5, -49.4], [-25.3, -49.2]],
      center: [-25.4, -49.3],
    });
  });

  it("rejects unsupported or empty geometries", () => {
    assert.equal(getGeoJsonBoundsAndCenter({ type: "Point", coordinates: [-49.2, -25.3] }), null);
    assert.equal(getGeoJsonBoundsAndCenter({ type: "Polygon", coordinates: [] }), null);
    assert.equal(getGeoJsonBoundsAndCenter(null), null);
    assert.equal(isPointInGeoJson({ type: "Point", coordinates: [-49.2, -25.3] }, -25.3, -49.2), false);
    assert.equal(isPointInGeoJson({ type: "Polygon", coordinates: [] }, -25.3, -49.2), false);
    assert.equal(isPointInGeoJson(null, -25.3, -49.2), false);
    assert.equal(isPointInGeoJson({ type: "Polygon", coordinates: [] }, Number.NaN, -49.2), false);
  });

  it("includes the polygon boundary and excludes hole interiors", () => {
    const feature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
          [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]],
        ],
      },
    };

    assert.equal(isPointInGeoJson(feature, 1, 1), true);
    assert.equal(isPointInGeoJson(feature, 5, 5), false);
    assert.equal(isPointInGeoJson(feature, 5, 0), true, "outer boundary is included");
    assert.equal(isPointInGeoJson(feature, 5, 3), true, "hole boundary is included");
    assert.equal(isPointInGeoJson(feature, 11, 5), false);
    assert.equal(isPointInGeoJson(feature, 91, 5), false);
  });

  it("supports MultiPolygon and FeatureCollection boundaries", () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
              [[[8, 8], [10, 8], [10, 10], [8, 10], [8, 8]]],
            ],
          },
        },
      ],
    };

    assert.equal(isPointInGeoJson(featureCollection, 1, 1), true);
    assert.equal(isPointInGeoJson(featureCollection, 9, 9), true);
    assert.equal(isPointInGeoJson(featureCollection, 5, 5), false);
    const representativePoint = getPointInGeoJson(featureCollection);
    assert.ok(representativePoint);
    assert.equal(representativePoint.length, 2);
    assert.equal(
      isPointInGeoJson(featureCollection, representativePoint[0], representativePoint[1]),
      true,
    );
  });

  it("keeps Araucária active and enables Curitiba as the second municipality", () => {
    const araucaria = DEFAULT_SEEDED_CITIES.find((city) => city.id === "araucaria-pr");
    const curitiba = DEFAULT_SEEDED_CITIES.find((city) => city.id === "curitiba-pr");
    const activeCityIds = DEFAULT_SEEDED_CITIES.filter((city) => city.is_active).map((city) => city.id).sort();

    assert.ok(araucaria);
    assert.equal(araucaria.is_active, true);
    assert.ok(curitiba);
    assert.equal(curitiba.ibge_code, "4106902");
    assert.equal(curitiba.name, "Curitiba");
    assert.equal(curitiba.state, "PR");
    assert.equal(curitiba.is_active, true);
    assert.deepEqual(activeCityIds, ["araucaria-pr", "curitiba-pr"]);
    assert.equal(cityFeature(curitiba)?.type, "Feature");
    assert.deepEqual(
      getGeoJsonBoundsAndCenter(cityFeature(curitiba)),
      getGeoJsonBoundsAndCenter(curitiba.boundary_geojson),
    );
  });

  it("keeps occurrence coordinates inside the selected Araucária or Curitiba boundary", () => {
    const araucaria = DEFAULT_SEEDED_CITIES.find((city) => city.id === "araucaria-pr");
    const curitiba = DEFAULT_SEEDED_CITIES.find((city) => city.id === "curitiba-pr");
    assert.ok(araucaria);
    assert.ok(curitiba);

    assert.equal(
      isPointInGeoJson(cityFeature(araucaria), araucaria.center_lat, araucaria.center_lng),
      true,
    );
    assert.equal(
      isPointInGeoJson(cityFeature(curitiba), curitiba.center_lat, curitiba.center_lng),
      true,
    );
    assert.equal(
      isPointInGeoJson(cityFeature(araucaria), curitiba.center_lat, curitiba.center_lng),
      false,
      "a Curitiba coordinate must not be accepted for Araucária",
    );
    assert.equal(
      isPointInGeoJson(cityFeature(curitiba), araucaria.center_lat, araucaria.center_lng),
      false,
      "an Araucária coordinate must not be accepted for Curitiba",
    );
  });

  it("rejects a city row with no supported boundary type", () => {
    const city = {
      id: "test-city",
      ibge_code: "1234567",
      name: "Município Fictício",
      state: "PR",
      is_active: true,
      center_lat: 0,
      center_lng: 0,
      default_zoom: 12,
      boundary_geojson: { type: "Point", coordinates: [0, 0] },
    } satisfies CityItem;

    assert.equal(cityFeature(city), null);
    assert.equal(isPointInGeoJson(cityFeature(city), 0, 0), false);
    assert.equal(getPointInGeoJson(cityFeature(city)), null);
  });
});
