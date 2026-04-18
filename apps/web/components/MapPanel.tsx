"use client";

import { useEffect, useRef } from "react";
import type { Map as MaplibreMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { SiteGeo } from "@/lib/geo/types";

function buildStyle(geo: SiteGeo): StyleSpecification {
  return {
    version: 8,
    name: "grid-passport-dossier",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      county: { type: "geojson", data: geo.county },
      parcel: { type: "geojson", data: geo.parcel },
      flood: {
        type: "geojson",
        data: geo.floodOverlay ?? {
          type: "FeatureCollection",
          features: [],
        },
      },
      transmission: { type: "geojson", data: geo.transmissionLine },
      substation: { type: "geojson", data: geo.substation },
    },
    layers: [
      {
        id: "bg",
        type: "background",
        paint: { "background-color": "#0a0a0a" },
      },
      {
        id: "county-fill",
        type: "fill",
        source: "county",
        paint: { "fill-color": "#111c2e", "fill-opacity": 0.8 },
      },
      {
        id: "county-line",
        type: "line",
        source: "county",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 1,
          "line-dasharray": [3, 3],
          "line-opacity": 0.5,
        },
      },
      {
        id: "flood-fill",
        type: "fill",
        source: "flood",
        paint: { "fill-color": "#d97706", "fill-opacity": 0.22 },
      },
      {
        id: "flood-outline",
        type: "line",
        source: "flood",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 1.2,
          "line-dasharray": [2, 2],
        },
      },
      {
        id: "transmission-line",
        type: "line",
        source: "transmission",
        paint: {
          "line-color": "#64748b",
          "line-width": 2,
          "line-opacity": 0.8,
        },
      },
      {
        id: "parcel-fill",
        type: "fill",
        source: "parcel",
        paint: { "fill-color": "#84cc16", "fill-opacity": 0.18 },
      },
      {
        id: "parcel-outline",
        type: "line",
        source: "parcel",
        paint: { "line-color": "#a3e635", "line-width": 1.8 },
      },
      {
        id: "substation-point",
        type: "circle",
        source: "substation",
        paint: {
          "circle-radius": 6,
          "circle-color": "#38bdf8",
          "circle-stroke-color": "#082f49",
          "circle-stroke-width": 2,
        },
      },
    ],
  };
}

export function MapPanel({ geo }: { geo: SiteGeo }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      const map = new maplibre.Map({
        container: containerRef.current,
        style: buildStyle(geo),
        center: [geo.center.lng, geo.center.lat],
        zoom: geo.zoom,
        attributionControl: false,
        interactive: true,
        dragRotate: false,
      });
      map.addControl(
        new maplibre.NavigationControl({ showCompass: false }),
        "top-right",
      );
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [geo]);

  return (
    <div className="overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
      <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-4 py-2.5">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-[0.18em] text-sky-200">
            site context · public layers
          </span>
          <span className="text-[11px] text-neutral-500">
            {geo.county.properties.name}
          </span>
        </div>
        <LegendDot />
      </header>
      <div
        ref={containerRef}
        className="h-[320px] w-full"
        role="presentation"
        aria-label="Synthetic map showing parcel, transmission, and hazard context"
      />
      <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-900 bg-neutral-950 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-neutral-500">
        <Legend swatch="bg-lime-400" label="parcel" />
        <Legend swatch="bg-amber-500/50 border-amber-400" label="flood" />
        <Legend swatch="bg-slate-500" label="transmission" />
        <Legend swatch="bg-sky-400" label="substation" />
        <span className="ml-auto text-neutral-600">synthetic</span>
      </footer>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-sm border ${swatch}`} />
      {label}
    </span>
  );
}

function LegendDot() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-400" />
      live
    </span>
  );
}
