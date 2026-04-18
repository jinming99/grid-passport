/**
 * Synthetic GeoJSON fixtures for the three demo cases.
 *
 * Coordinates are deliberately approximate — the point is to show spatial
 * context and overlay interaction, not real parcel geometry.
 */

import type { SiteGeo } from "./types";

function rectAround(
  lng: number,
  lat: number,
  widthDeg: number,
  heightDeg: number,
): GeoJSON.Polygon {
  const hw = widthDeg / 2;
  const hh = heightDeg / 2;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - hw, lat - hh],
        [lng + hw, lat - hh],
        [lng + hw, lat + hh],
        [lng - hw, lat + hh],
        [lng - hw, lat - hh],
      ],
    ],
  };
}

function diamond(
  lng: number,
  lat: number,
  radDeg: number,
): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng, lat + radDeg],
        [lng + radDeg, lat],
        [lng, lat - radDeg],
        [lng - radDeg, lat],
        [lng, lat + radDeg],
      ],
    ],
  };
}

// -------- Owl Compute · Prince William, VA --------
const OWL_CENTER = { lng: -77.48, lat: 38.705 };
const owlCompute: SiteGeo = {
  caseId: "owl-compute",
  center: OWL_CENTER,
  zoom: 12,
  parcel: {
    type: "Feature",
    geometry: rectAround(OWL_CENTER.lng, OWL_CENTER.lat, 0.008, 0.006),
    properties: { name: "Owl Compute parcel", area_acres: 148 },
  },
  county: {
    type: "Feature",
    geometry: diamond(OWL_CENTER.lng, OWL_CENTER.lat, 0.18),
    properties: { name: "Prince William County" },
  },
  floodOverlay: null,
  substation: {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [OWL_CENTER.lng - 0.025, OWL_CENTER.lat + 0.011],
    },
    properties: {
      name: "Gainesville 230 kV substation",
      kv: 230,
      distance_mi: 1.7,
    },
  },
  transmissionLine: {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [OWL_CENTER.lng - 0.08, OWL_CENTER.lat + 0.04],
        [OWL_CENTER.lng - 0.025, OWL_CENTER.lat + 0.011],
        [OWL_CENTER.lng + 0.02, OWL_CENTER.lat - 0.006],
        [OWL_CENTER.lng + 0.09, OWL_CENTER.lat - 0.03],
      ],
    },
    properties: { name: "Dominion 230 kV corridor", kv: 230 },
  },
};

// -------- Lantern Cloud · Loudoun, VA --------
const LANTERN_CENTER = { lng: -77.595, lat: 39.095 };
const lanternCloud: SiteGeo = {
  caseId: "lantern-cloud",
  center: LANTERN_CENTER,
  zoom: 12,
  parcel: {
    type: "Feature",
    geometry: rectAround(LANTERN_CENTER.lng, LANTERN_CENTER.lat, 0.006, 0.0045),
    properties: { name: "Lantern Cloud parcel", area_acres: 88 },
  },
  county: {
    type: "Feature",
    geometry: diamond(LANTERN_CENTER.lng, LANTERN_CENTER.lat, 0.2),
    properties: { name: "Loudoun County" },
  },
  floodOverlay: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [LANTERN_CENTER.lng - 0.004, LANTERN_CENTER.lat - 0.004],
          [LANTERN_CENTER.lng + 0.01, LANTERN_CENTER.lat - 0.002],
          [LANTERN_CENTER.lng + 0.012, LANTERN_CENTER.lat + 0.003],
          [LANTERN_CENTER.lng + 0.002, LANTERN_CENTER.lat + 0.004],
          [LANTERN_CENTER.lng - 0.005, LANTERN_CENTER.lat + 0.002],
          [LANTERN_CENTER.lng - 0.004, LANTERN_CENTER.lat - 0.004],
        ],
      ],
    },
    properties: {
      class: "500-yr",
      label: "FEMA 500-yr flood hazard (crosses parcel)",
    },
  },
  substation: {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [LANTERN_CENTER.lng + 0.03, LANTERN_CENTER.lat + 0.014],
    },
    properties: {
      name: "Brambleton 230 kV substation",
      kv: 230,
      distance_mi: 2.1,
    },
  },
  transmissionLine: {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [LANTERN_CENTER.lng - 0.07, LANTERN_CENTER.lat + 0.05],
        [LANTERN_CENTER.lng - 0.02, LANTERN_CENTER.lat + 0.028],
        [LANTERN_CENTER.lng + 0.03, LANTERN_CENTER.lat + 0.014],
        [LANTERN_CENTER.lng + 0.09, LANTERN_CENTER.lat - 0.01],
      ],
    },
    properties: { name: "Dominion 230 kV corridor", kv: 230 },
  },
};

// -------- Kraken Train · Fauquier, VA --------
const KRAKEN_CENTER = { lng: -77.78, lat: 38.745 };
const krakenTrain: SiteGeo = {
  caseId: "kraken-train",
  center: KRAKEN_CENTER,
  zoom: 12,
  parcel: {
    type: "Feature",
    geometry: rectAround(KRAKEN_CENTER.lng, KRAKEN_CENTER.lat, 0.012, 0.009),
    properties: { name: "Kraken Train campus", area_acres: 320 },
  },
  county: {
    type: "Feature",
    geometry: diamond(KRAKEN_CENTER.lng, KRAKEN_CENTER.lat, 0.25),
    properties: { name: "Fauquier County" },
  },
  floodOverlay: null,
  substation: {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [KRAKEN_CENTER.lng + 0.045, KRAKEN_CENTER.lat - 0.02],
    },
    properties: {
      name: "Warrenton 500 kV substation",
      kv: 500,
      distance_mi: 3.0,
    },
  },
  transmissionLine: {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [KRAKEN_CENTER.lng - 0.12, KRAKEN_CENTER.lat - 0.04],
        [KRAKEN_CENTER.lng - 0.05, KRAKEN_CENTER.lat - 0.025],
        [KRAKEN_CENTER.lng + 0.045, KRAKEN_CENTER.lat - 0.02],
        [KRAKEN_CENTER.lng + 0.13, KRAKEN_CENTER.lat + 0.01],
      ],
    },
    properties: { name: "Dominion 500 kV corridor", kv: 500 },
  },
};

const REGISTRY: Record<string, SiteGeo> = {
  "owl-compute": owlCompute,
  "lantern-cloud": lanternCloud,
  "kraken-train": krakenTrain,
};

export function getSiteGeo(caseId: string): SiteGeo | null {
  return REGISTRY[caseId] ?? null;
}
