import { redirect } from "next/navigation";

/** Bring Your Own AI moved to its own tab at /ai. */
export default function OldAi() { redirect("/ai"); }
