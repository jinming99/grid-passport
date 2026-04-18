import type { CaseInput } from "@/lib/types";
import { owlCompute } from "./owl-compute";
import { lanternCloud } from "./lantern-cloud";
import { krakenTrain } from "./kraken-train";

export interface CaseMeta {
  caseId: string;
  displayName: string;
  tagline: string;
  requestedMW: number;
  county: string;
}

const REGISTRY: Record<string, CaseInput> = {
  "owl-compute": owlCompute,
  "lantern-cloud": lanternCloud,
  "kraken-train": krakenTrain,
};

export const CASE_METAS: CaseMeta[] = [
  {
    caseId: "owl-compute",
    displayName: "Owl Compute",
    tagline: "hyperscaler — proofs vs premise",
    requestedMW: 180,
    county: "Prince William",
  },
  {
    caseId: "lantern-cloud",
    displayName: "Lantern Cloud",
    tagline: "permit risk blocks electrical readiness",
    requestedMW: 95,
    county: "Loudoun",
  },
  {
    caseId: "kraken-train",
    displayName: "Kraken Train",
    tagline: "AI tenant — flexibility-first",
    requestedMW: 240,
    county: "Fauquier",
  },
];

export function getCase(caseId: string): CaseInput | null {
  return REGISTRY[caseId] ?? null;
}

export function listCases(): CaseInput[] {
  return Object.values(REGISTRY);
}

export const DEFAULT_CASE_ID = "owl-compute";
