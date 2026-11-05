import { CLUB } from "@/lib/club";
import { base, L, load, MembersOnly, Title, type Page } from "@/lib/page";

export default async function Members({ params }: Page) {
  const handle = CLUB;
  const { rows, signedIn } = await load(handle, () => [{ sql: "select slug, name, status from members order by status, name" }]);
  if (!rows) return <MembersOnly />;
  return <><Title>Members</Title><ul className="grid gap-2">{rows[0].filter((m) => m.status !== "guest").map((m) => <li key={m.slug}>{signedIn ? <L href={`${base(handle)}/members/${m.slug}`}>{m.name}</L> : m.name} <span className="faint">{m.status}</span></li>)}</ul></>;
}
