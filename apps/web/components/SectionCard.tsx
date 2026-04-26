export function SectionCard({
  title,
  subtitle,
  children,
  tone = "neutral",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "neutral" | "private" | "derived" | "public";
}) {
  const accent = {
    neutral: "border-neutral-800",
    private: "border-amber-900/60",
    derived: "border-lime-900/60",
    public: "border-slate-800",
  }[tone];

  return (
    <section
      className={`rounded-md border bg-neutral-950/40 ${accent} overflow-hidden`}
    >
      <header className="border-b border-neutral-900 bg-neutral-950 px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
        ) : null}
      </header>
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}
