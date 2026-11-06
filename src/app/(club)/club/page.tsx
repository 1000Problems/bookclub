import { redirect } from "next/navigation";
import { CLUB } from "@/lib/club";
import { base, L, load, MembersOnly, Notice, Title, type Page } from "@/lib/page";
import { Md } from "@/lib/text";

export default async function Club({ searchParams }: Page) {
  const handle = CLUB;
  const q = await searchParams, b = base(handle), here = `${b}/club`;
  if (q.find) redirect(`/admin?find=${encodeURIComponent(q.find)}#find`);       // old links into the admin sections
  const { rows, signedIn } = await load(handle, () => [{ sql: "select * from club" }]);
  if (!rows) return <MembersOnly />;
  const c = rows[0][0];
  return <><Notice q={q} handle={handle} here={here} /><Title>{c.name}</Title>{c.about && <Md text={c.about} />}
    <p className="my-3 flex gap-3"><L href={`${b}/members`}>Members</L>{signedIn && <L href={`${b}/club/ai`}>Connect your AI</L>}</p>
    {signedIn && <form method="post" action="/auth/signout"><button className="btn btn-ghost">Sign out</button></form>}</>;
}
