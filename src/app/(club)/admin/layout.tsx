import { headers } from "next/headers";
import { Narrow } from "@/components/ui";
import { L } from "@/lib/page";

const LINKS = [["Overview", "/admin"], ["Members", "/admin/members"], ["Meetings", "/admin/meetings"]];

export default async function Admin({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-sc-path") ?? "";
  return <Narrow><nav className="sc-subnav" aria-label="Admin">{LINKS.map(([t, h]) => <L key={h} href={h} className={`sc-tab${path === h ? " on" : ""}`} aria-current={path === h ? "page" : undefined}>{t}</L>)}</nav>{children}</Narrow>;
}
