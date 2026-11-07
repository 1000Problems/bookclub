/** Open Library candidates for a book with no ISBN match (TASK-55). */
export async function findEditions(title: string, author: string | null) {
  const u = `https://openlibrary.org/search.json?${new URLSearchParams({ title, ...(author ? { author: author.split(",")[0] } : {}), limit: "8", fields: "title,author_name,first_publish_year,isbn,cover_i" })}`;
  const j = await fetch(u, { headers: { "user-agent": "SoulCrushersBookClub/1.0 (bookclub.hadmoney.com)" }, next: { revalidate: 3600 } }).then((r) => r.json()).catch(() => null);
  const out: { isbn: string; title: string; author: string; year: number | null; cover: string | null }[] = [];
  for (const d of j?.docs ?? []) {
    const isbn = (d.isbn ?? []).find((x: string) => /^97[89]\d{10}$/.test(x));
    if (!isbn || out.some((o) => o.isbn === isbn)) continue;
    out.push({ isbn, title: d.title, author: (d.author_name ?? []).join(", "), year: d.first_publish_year ?? null, cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : null });
    if (out.length === 5) break;
  }
  return out;
}
