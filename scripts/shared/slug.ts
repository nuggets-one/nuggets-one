export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateArticleSlug(title: string, id: string): string {
  const base = slugify(title);
  const suffix = id.replace(/-/g, "").slice(0, 6);
  return `${base}-${suffix}`;
}
