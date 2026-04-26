import type { SiteGeo } from "@grid-passport/core/geo/types";
import { MapPanel } from "./MapPanel";

export function EvidencePanel({ geo }: { geo: SiteGeo }) {
  const sub = geo.substation.properties;
  const line = geo.transmissionLine.properties;
  const parcel = geo.parcel.properties;
  return (
    <aside className="flex flex-col gap-4">
      <MapPanel geo={geo} />
      <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-4">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-neutral-300">
            interconnection context
          </h3>
          <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            public
          </span>
        </header>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-neutral-500">nearest substation</dt>
          <dd className="text-right text-neutral-100">{sub.name}</dd>
          <dt className="text-neutral-500">voltage</dt>
          <dd className="text-right font-mono tabular-nums text-neutral-100">
            {sub.kv} kV
          </dd>
          <dt className="text-neutral-500">distance</dt>
          <dd className="text-right font-mono tabular-nums text-neutral-100">
            {sub.distance_mi} mi
          </dd>
          <dt className="text-neutral-500">corridor</dt>
          <dd className="text-right text-neutral-100">{line.name}</dd>
          <dt className="text-neutral-500">parcel area</dt>
          <dd className="text-right font-mono tabular-nums text-neutral-100">
            {parcel.area_acres} ac
          </dd>
        </dl>
      </div>
      {geo.floodOverlay ? (
        <div className="rounded-md border border-amber-900/40 bg-amber-950/10 p-4 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.18em] text-amber-300">
              hazard flag
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-amber-500">
              {geo.floodOverlay.properties.class}
            </span>
          </div>
          <p className="text-neutral-300 leading-relaxed">
            {geo.floodOverlay.properties.label}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
