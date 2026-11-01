// Video links for portfolio projects. Only YouTube, Vimeo and Facebook links are accepted (https only).
// YouTube and Vimeo play inside the page; a Facebook link opens on Facebook, because Facebook does not
// allow a video to be embedded from a plain link. The stored link is checked again before it is shown.

export type VideoInfo = {
  url: string;
  provider: "youtube" | "vimeo" | "facebook";
  /** Address for the player inside the page, or null when the link can only be opened. */
  embedSrc: string | null;
};

const BAD = "Please paste a YouTube, Vimeo or Facebook video link.";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{5,12}$/;

export function parseVideoUrl(
  raw: string,
): { ok: true; video: VideoInfo | null } | { ok: false; message: string } {
  const text = raw.trim();
  if (text === "") return { ok: true, video: null };
  if (text.length > 300)
    return { ok: false, message: "That link is too long." };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : `https://${text}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, message: BAD };
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port)
    return { ok: false, message: BAD };
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const segs = u.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtu.be") {
    let id = "";
    if (host === "youtu.be") id = segs[0] ?? "";
    else if (segs[0] === "watch") id = u.searchParams.get("v") ?? "";
    else if (["embed", "shorts", "live"].includes(segs[0] ?? ""))
      id = segs[1] ?? "";
    if (!YT_ID.test(id)) return { ok: false, message: BAD };
    return {
      ok: true,
      video: {
        url: `https://www.youtube.com/watch?v=${id}`,
        provider: "youtube",
        embedSrc: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      },
    };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id =
      host === "vimeo.com" ? segs[0] : segs[0] === "video" ? segs[1] : "";
    if (!id || !VIMEO_ID.test(id)) return { ok: false, message: BAD };
    return {
      ok: true,
      video: {
        url: `https://vimeo.com/${id}`,
        provider: "vimeo",
        embedSrc: `https://player.vimeo.com/video/${id}`,
      },
    };
  }
  if (host === "facebook.com" || host === "fb.watch" || host === "fb.com") {
    if (segs.length === 0) return { ok: false, message: BAD };
    return {
      ok: true,
      video: {
        url: `https://${host === "fb.com" ? "facebook.com" : host}${u.pathname}${host === "facebook.com" || host === "fb.com" ? u.search : ""}`.slice(
          0,
          300,
        ),
        provider: "facebook",
        embedSrc: null,
      },
    };
  }
  return { ok: false, message: BAD };
}

/** For display: a video only if the stored text passes the same check, otherwise null. */
export function videoFromStored(stored: unknown): VideoInfo | null {
  if (typeof stored !== "string" || !stored) return null;
  const r = parseVideoUrl(stored);
  return r.ok ? r.video : null;
}