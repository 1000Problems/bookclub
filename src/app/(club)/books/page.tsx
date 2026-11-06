import { redirect } from "next/navigation";
import type { Page } from "@/lib/page";

/** The Books tab became Home's shelf. Old links land on the matching shelf. */
export default async function Books({ searchParams }: Page) {
  const { y } = await searchParams;
  redirect(y ? `/?y=${encodeURIComponent(y)}#books` : "/#books");
}
