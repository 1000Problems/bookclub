import Link from "next/link";
import type { Row } from "@/lib/studio";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthName = (slug: string) => `${MONTHS[Number(slug.slice(5, 7)) - 1]} ${slug.slice(0, 4)}`;
export const short = (at: string) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
export const ini = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
export const toYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" });
export const toHm = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit" });
export const LOCKED_SELF = "That's you. You can't change your own role or remove yourself.", LOCKED_LAST = "The club needs at least one admin.";

/** Everything a month's sheet row needs. Shared by Next meeting and a past month's details. */
export function SheetFields({ m, book, numberHint }: { m: Row | undefined; book: boolean; numberHint?: number | null }) {
  return <div className="ad-fields">
    {book && <><label className="ad-l">Goodreads link<input className="ad-i" type="url" name="link_url" defaultValue={m?.link_url ?? ""} placeholder="https://www.goodreads.com/book/show/…" /></label>
      <label className="ad-l">Goodreads rating<input className="ad-i" type="number" name="goodreads_avg" min={1} max={5} step={0.01} defaultValue={m?.goodreads_avg ?? ""} placeholder="e.g. 4.12" /></label>
      <label className="ad-l">Author, as the sheet writes it<input className="ad-i" name="sheet_author" defaultValue={m?.author ?? ""} /></label>
      <label className="ad-l">Title color<select className="ad-i" name="title_color" defaultValue={m?.title_color ?? "blue"}><option value="blue">Blue</option><option value="red">Red</option></select></label>
      <label className="ad-c"><input type="checkbox" name="title_bold" defaultChecked={!!m?.title_bold} />Bold</label></>}
    <label className="ad-l">Meeting number<input className="ad-i" type="number" name="number" defaultValue={m?.number ?? numberHint ?? ""} placeholder="#" />{m?.number == null && numberHint != null && <span className="ad-note">Worked out from the last numbered meeting.</span>}</label>
    <label className="ad-c"><input type="checkbox" name="no_score" defaultChecked={!!m?.no_score} />No score this month</label>
  </div>;
}
export const HostSelect = ({ people, value }: { people: Row[]; value?: string | null }) => <label className="ad-l">Host<select className="ad-i" name="host" defaultValue={value ?? ""}><option value="">Not set</option>{people.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>;


/** Admin is two tabs: Club (nothing tied to a month) and Meetings (every month, one editor). */
export const AdminTabs = ({ on }: { on: "club" | "meetings" }) => <nav className="ad-jump" aria-label="Admin">
  <Link href="/admin/club" aria-current={on === "club" ? "page" : undefined}>Club</Link><Link href="/admin" aria-current={on === "meetings" ? "page" : undefined}>Meetings</Link></nav>;

/** Sheet rule: each month the club meets is the previous number + 1; skipped months use none. */
export function workedOutNumber(meetings: Row[], slug: string): number | null {
  const me = meetings.find((m) => m.slug === slug);
  if (me?.status === "skipped") return null;
  const before = meetings.filter((m) => m.slug < slug).sort((a, b) => (a.slug < b.slug ? 1 : -1));
  const base = before.find((m) => m.number != null && m.status !== "skipped");
  if (!base) return null;
  const between = before.filter((m) => m.slug > base.slug && m.status !== "skipped").length;
  return Number(base.number) + between + 1;
}
