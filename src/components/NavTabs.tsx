"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** The layout doesn't re-render between pages, so the tab that's on is worked out here. Home is a plain link: it always lands on the main page, whatever shelf was picked. */
export function NavTabs({ admin }: { admin: boolean }) {
  const path = usePathname();
  const on = (t: boolean) => `sc-tab${t ? " on" : ""}`;
  return <nav className="flex gap-0.5">
    <a href="/" className={on(/^\/($|m\/|b\/|author)/.test(path))}>Home</a>
    <Link href="/members" className={on(path.startsWith("/members"))}>Members</Link>
    {admin && <Link href="/admin" className={on(path.startsWith("/admin"))}>Admin</Link>}
  </nav>;
}
