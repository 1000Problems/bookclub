import { CLUB } from "@/lib/club";
import { base, L, load, MembersOnly, Title, type Page } from "@/lib/page";

export default async function Talk({ params }: Page) {
  const handle = CLUB;
  const { rows } = await load(handle, () => [{ sql: "select slug, title, kind, pinned from threads order by pinned desc, kind, slug desc" }]);
  if (!rows) return <MembersOnly />;
  return <><Title>Talk</Title><ul className="grid gap-2">{rows[0].map((t) => <li key={t.slug}><L className="card-lift p-3 block" href={`${base(handle)}/talk/${t.slug}`}>{t.title}</L></li>)}</ul>{rows[0].length === 0 && <p className="muted">No talk yet.</p>}</>;
}
