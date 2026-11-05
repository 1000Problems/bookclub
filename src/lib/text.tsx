import type { ReactNode } from "react";

/** Chat Markdown: links, bold, italics, paragraphs. No raw HTML, no images (§4.4): React escapes all text. */
function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let i = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > i) out.push(s.slice(i, m.index));
    if (m[1]) out.push(<a key={k++} href={m[2]} rel="nofollow noopener">{m[1]}</a>);
    else if (m[3]) out.push(<strong key={k++}>{m[3]}</strong>);
    else out.push(<em key={k++}>{m[4]}</em>);
    i = re.lastIndex;
  }
  out.push(s.slice(i));
  return out;
}
export const Md = ({ text }: { text: string }) => <div className="prose-note">{text.split(/\n{2,}/).map((p, i) => <p key={i}>{inline(p)}</p>)}</div>;

const PT = "America/Los_Angeles";
export const whenLong = (at: string | null) => at ? `${new Date(at).toLocaleDateString("en-US", { timeZone: PT, weekday: "short", month: "short", day: "numeric" })} · ${new Date(at).toLocaleTimeString("en-US", { timeZone: PT, hour: "numeric", minute: "2-digit" }).replace(":00", "").toLowerCase()}` : "Date TBD";
export const monthYear = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
export function ago(at: string) {
  const m = Math.round((Date.now() - new Date(at).getTime()) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}
