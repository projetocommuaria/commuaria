import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SEEDED_CITIES } from "../data/rmcIbgeCities";
import type { CityItem } from "../types";
import { cityFeature, getGeoJsonBoundsAndCenter } from "./cityGeometry";

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
  });
});
