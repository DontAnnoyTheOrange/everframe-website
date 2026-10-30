// Messenger link rules. The booking form asks for a LINK (not a name), because many people share the
// same name. A link opens the exact person's chat. We accept the links people really copy:
//   https://m.me/juan.delacruz                      (Messenger link)
//   https://www.messenger.com/t/juan.delacruz       (Messenger on the web)
//   https://www.facebook.com/juan.delacruz          (Facebook profile)
//   https://www.facebook.com/profile.php?id=1000123 (Facebook profile without a username)
//   https://www.facebook.com/people/Juan/1000123/   (Facebook profile, long form)
//   https://www.facebook.com/share/AbCdEf/          (Facebook "copy link" share link)
// Everything is turned into a clean https://m.me/... link when possible, so one click from the admin
// screen opens the chat. Other websites, posts, groups and anything with a script are refused.

export type MessengerResult =
  { ok: true; url: string } | { ok: false; message: string };

const FB_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "mobile.facebook.com",
  "mbasic.facebook.com",
  "fb.com",
  "www.fb.com",
]);
const ME_HOSTS = new Set(["m.me", "www.m.me"]);
const MESSENGER_HOSTS = new Set(["messenger.com", "www.messenger.com"]);

// First path words on Facebook that are NOT a person's profile.
const NOT_A_PROFILE = new Set([
  "groups",
  "pages",
  "events",
  "marketplace",
  "watch",
  "photo",
  "photos",
  "posts",
  "reel",
  "reels",
  "videos",
  "stories",
  "story.php",
  "permalink.php",
  "sharer",
  "sharer.php",
  "dialog",
  "login",
  "login.php",
  "help",
  "settings",
  "hashtag",
  "gaming",
  "search",
  "friends",
  "messages",
  "notifications",
  "bookmarks",
  "business",
  "ads",
  "policies",
  "privacy",
  "about",
  "home.php",
]);

const SLUG = /^[A-Za-z0-9._-]{1,100}$/; // m.me / messenger.com names
const FB_USERNAME = /^[A-Za-z0-9.]{5,50}$/; // Facebook usernames
const DIGITS = /^\d{5,25}$/;
const SHARE_CODE = /^[A-Za-z0-9_-]{5,60}$/;

const GENERIC =
  "Please paste a Messenger or Facebook profile link, for example https://m.me/yourname";

export const MESSENGER_MAX = 200;

export function parseMessengerLink(raw: string): MessengerResult {
  let text = raw.trim();
  if (!text) {
    return { ok: false, message: "Please paste your Messenger link." };
  }
  if (text.length > MESSENGER_MAX) {
    return { ok: false, message: "That link is too long." };
  }
  // Allow "m.me/juan" without https://, but never other schemes (javascript:, data:, ...).
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[a-z0-9.-]+:\d+/i.test(text)) {
      return { ok: false, message: GENERIC };
    }
    text = `https://${text}`;
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, message: GENERIC };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, message: GENERIC };
  }
  if (url.username || url.password || url.port) {
    return { ok: false, message: GENERIC };
  }

  const host = url.hostname.toLowerCase();
  const segs = url.pathname.split("/").filter(Boolean);
  const chat = (id: string): MessengerResult => ({
    ok: true,
    url: `https://m.me/${id}`,
  });

  if (ME_HOSTS.has(host)) {
    const slug = segs[0];
    if (
      segs.length >= 1 &&
      slug &&
      SLUG.test(slug) &&
      slug !== "j" &&
      slug !== "ref"
    ) {
      return chat(slug);
    }
    return { ok: false, message: GENERIC };
  }

  if (MESSENGER_HOSTS.has(host)) {
    if (segs[0] === "t" && segs[1] && SLUG.test(segs[1])) return chat(segs[1]);
    return { ok: false, message: GENERIC };
  }

  if (FB_HOSTS.has(host)) {
    const first = (segs[0] ?? "").toLowerCase();
    if (first === "profile.php") {
      const id = url.searchParams.get("id") ?? "";
      if (DIGITS.test(id)) return chat(id);
    } else if (first === "people") {
      const id = segs[segs.length - 1] ?? "";
      if (segs.length >= 3 && DIGITS.test(id)) return chat(id);
    } else if (first === "share") {
      // New "copy link" format. m.me cannot read it, so it is kept as a Facebook link.
      const code = segs[1] === "p" || segs[1] === "v" ? segs[2] : segs[1];
      if (code && SHARE_CODE.test(code)) {
        return { ok: true, url: `https://www.facebook.com/share/${code}/` };
      }
    } else if (
      segs.length === 1 &&
      !NOT_A_PROFILE.has(first) &&
      !first.endsWith(".php") && // photo.php, video.php ... are pages, not people
      FB_USERNAME.test(segs[0])
    ) {
      return chat(segs[0]);
    }
    return {
      ok: false,
      message:
        "That Facebook link does not point to a profile. Please paste the link to your own Messenger or profile.",
    };
  }

  return { ok: false, message: GENERIC };
}

/**
 * A safe, clickable link for text saved in the database, or null.
 * Older bookings may hold a plain name instead of a link, and nothing from the database is trusted
 * as a link without checking it again, so a saved "javascript:..." can never become a clickable link.
 */
export function messengerHref(stored: string | null): string | null {
  if (!stored) return null;
  const r = parseMessengerLink(stored);
  return r.ok ? r.url : null;
}