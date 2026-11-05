import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE } from "@/lib/viewer";

export default async function Root() {
  const club = (await cookies()).get(COOKIE.club)?.value;
  if (club) redirect(`/c/${club}`);
  return <main className="mx-auto max-w-md p-6"><div className="card p-6"><p className="serif text-2xl">Book Club</p><p className="muted mt-2">Members: sign in.</p><a className="btn btn-ink mt-4" href="/auth/signin">Sign in</a></div></main>;
}
