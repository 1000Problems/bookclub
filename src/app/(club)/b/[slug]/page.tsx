import { notFound, redirect } from "next/navigation";
import { CLUB } from "@/lib/club";
import { load, MembersOnly, type Page } from "@/lib/page";

export default async function Book({ params }: Page) {
  const { slug } = await params;
  const { rows } = await load(CLUB, () => [{ sql: "select meetings from book_cards where slug = $1", params: [slug] }]);
  if (!rows) return <MembersOnly />;
  const m = rows[0][0]?.meetings?.at(-1);
  if (!m) notFound();
  redirect(`/m/${m}`);
}
