export interface LngLat {
  lng: number;
  lat: number;
}

export interface SiteGeo {
  caseId: string;
  center: LngLat;
  zoom: number;
  parcel: GeoJSON.Feature<GeoJSON.Polygon, { name: string; area_acres: number }>;
  county: GeoJSON.Feature<GeoJSON.Polygon, { name: string }>;
  floodOverlay: GeoJSON.Feature<
    GeoJSON.Polygon,
    { class: "100-yr" | "500-yr"; label: string }
  > | null;
  substation: GeoJSON.Feature<
    GeoJSON.Point,
    { name: string; kv: number; distance_mi: number }
  >;
  transmissionLine: GeoJSON.Feature<
    GeoJSON.LineString,
    { name: string; kv: number }
  >;
}
