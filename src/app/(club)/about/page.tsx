import { CLUB } from "@/lib/club";
import { L, load, MembersOnly, Title } from "@/lib/page";
import { Md } from "@/lib/text";

export default async function About() {
  const { rows } = await load(CLUB, () => [{ sql: "select name, about from club" }]);
  if (!rows) return <MembersOnly />;
  const c = rows[0][0];
  return <><Title eyebrow="About">{c.name}</Title>{c.about && <Md text={c.about} />}<p className="my-3"><L href="/members">Members</L></p></>;
}
