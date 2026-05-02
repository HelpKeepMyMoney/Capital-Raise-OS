/** Extract YouTube video id from common URL shapes (watch, embed, shorts, youtu.be). */
export function parseYoutubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^[\w-]{11}$/.test(raw)) return raw;

  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0]?.trim();
      if (id && /^[\w-]{11}$/.test(id)) return id;
      return null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host.endsWith(".youtube.com")) {
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.slice("/shorts/".length).split("/")[0]?.trim();
        if (id && /^[\w-]{11}$/.test(id)) return id;
      }
      if (u.pathname.startsWith("/embed/")) {
        const id = u.pathname.slice("/embed/".length).split("/")[0]?.trim();
        if (id && /^[\w-]{11}$/.test(id)) return id;
      }
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
    }
  } catch {
    return null;
  }

  return null;
}
