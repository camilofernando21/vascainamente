import { formatDateShort } from "@/lib/time";

// Public feed of the official Vasco TV channel.
export const VASCO_TV_CHANNEL_ID = "UCZD5qcen7lbLPFTjfvdLFcw";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${VASCO_TV_CHANNEL_ID}`;
export const VASCO_TV_CHANNEL_URL = `https://www.youtube.com/channel/${VASCO_TV_CHANNEL_ID}`;

export interface ChannelVideo {
  id: string;
  title: string;
  published: string;
  dateLabel: string;
}

const LIVE = /\bao vivo\b|\blive\b/i;

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// "TREINO 08.10 | VASCOTV" -> "TREINO 08.10": the channel name is already the section's title
function cleanTitle(title: string): string {
  return title.replace(/\s*\|\s*VASCO\s?TV\s*$/i, "").trim();
}

/** Latest videos of the channel, without live broadcasts. Never throws: a failed feed hides the section. */
export async function getVascoTvVideos(limit = 6): Promise<ChannelVideo[]> {
  try {
    const res = await fetch(FEED_URL, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return xml
      .split("<entry>")
      .slice(1)
      .map((entry) => {
        const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? "";
        const title = decode(entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
        const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
        return { id, title, published };
      })
      .filter((v) => v.id && v.title && !LIVE.test(v.title))
      .slice(0, limit)
      .map((v) => ({ ...v, title: cleanTitle(v.title), dateLabel: v.published ? formatDateShort(v.published) : "" }));
  } catch {
    return [];
  }
}
