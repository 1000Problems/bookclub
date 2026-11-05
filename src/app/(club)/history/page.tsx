import { CLUB } from "@/lib/club";
import { base, L, load, MembersOnly, Title, type Page } from "@/lib/page";

export default async function History({ params }: Page) {
  const handle = CLUB;
  const { rows } = await load(handle, () => [{ sql: "select slug, month, year, status, scoring, title, author, cover_url, club_score, gr_x2, rank_all, host_name, venue_label from meeting_cards order by month desc" }]);
  if (!rows) return <MembersOnly />;
  const years = [...new Set(rows[0].map((m) => m.year))];
  return <><Title>History</Title>{rows[0].length === 0 && <p className="muted">Add your first meeting · Import a sheet</p>}
    {years.map((y) => <section key={y} className="mb-6"><h2 className="label mb-2">{y}</h2><div className="grid gap-2">
      {rows[0].filter((m) => m.year === y).map((m) => m.status === "skipped"
        ? <p key={m.slug} className="faint text-sm">{m.slug} skipped</p>
        : <L key={m.slug} href={`${base(handle)}/m/${m.slug}`} className="card-lift p-4 flex justify-between gap-3">
            <span><span className="serif text-lg block">{m.title ?? "Book TBD"}</span><span className="muted text-sm">{m.host_name}</span></span>
            <span className="mono text-right">{m.club_score != null ? Number(m.club_score).toFixed(1) : <span className="muted text-sm">{m.status === "planned" ? "upcoming" : "scores not in yet"}</span>}
              {m.gr_x2 != null && <span className="faint text-xs block">GR×2 {Number(m.gr_x2).toFixed(1)}</span>}</span>
          </L>)}
    </div></section>)}</>;
}
