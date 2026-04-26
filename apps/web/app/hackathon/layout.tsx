import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grid Passport · Hackathon — Grid-Aware AI Agents for Data-Center Demand",
  description:
    "A grid-aware multi-agent system for 180 MW interconnection. Private data stays local. Utilities see proofs, not premises.",
};

export default function HackathonLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="hud-backdrop relative min-h-screen text-neutral-200">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.035]"
      >
        <div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-cyan-200 to-transparent [animation:scanline-drift_9s_linear_infinite]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
