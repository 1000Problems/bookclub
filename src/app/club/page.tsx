import { redirect } from "next/navigation";
import type { Page } from "@/lib/page";

/** Old links. /club became /account and /about; the book match list moved to /admin. */
export default async function OldClub({ searchParams }: Page) {
  const { find } = await searchParams;
  redirect(find ? `/admin?find=${encodeURIComponent(find)}#find` : "/account");
}
