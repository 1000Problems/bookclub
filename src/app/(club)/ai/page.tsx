import { CLUB } from "@/lib/club";
import { liveViewer, MembersOnly } from "@/lib/page";
import { sql, studio } from "@/lib/studio";
import { ConnectAi } from "./ConnectAi";
import { ADMIN, arrange } from "./prompts";

const CTX = `select
  exists (select 1 from meetings where scoring = 'open') as scoring,
  exists (select 1 from slates where status = 'voting') as voting,
  coalesce((select n from member_stats where member = m.slug), 0) > 0 as scored
  from me m`;

export default async function Ai() {
  const v = await liveViewer(CLUB);
  if (v.kind !== "member") return <MembersOnly />;
  const [c, me] = await Promise.all([studio(v, "/site/connection").catch(() => ({ state: "none" })), sql(v, [{ sql: "select name, role from me" }]).then((r) => r.rows[0][0]).catch(() => null)]);
  const cx = await sql(v, [{ sql: CTX }]).then((r) => r.rows[0][0]).catch(() => null);
  const ini = String(me?.name ?? "You").split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  return <ConnectAi handle={CLUB} initial={c} ini={ini} sections={arrange({ scoring: !!cx?.scoring, voting: !!cx?.voting, scored: cx ? !!cx.scored : true })} admin={me?.role === "scribe" ? ADMIN : null} />;
}
