"use client";
/** A month picker that reloads the page for the chosen month. Without JavaScript the Open button does the same. */
export function MonthPick({ options, value, keep }: { options: { slug: string; label: string }[]; value: string; keep: Record<string, string> }) {
  return <form method="get" className="ad-line ad-monthpick">
    {Object.entries(keep).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
    <select className="ad-pick" name="m" defaultValue={value} aria-label="Month" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
    </select>
    <noscript><button className="ad-b">Open</button></noscript>
  </form>;
}
