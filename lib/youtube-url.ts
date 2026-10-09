// Official Vasco TV embeds only: never download or self-host the videos.
export const YT_ORIGIN = "https://www.youtube-nocookie.com";

export function ytEmbedUrl(id: string, params: Record<string, string | number>): string {
  const query = new URLSearchParams(
    Object.entries({ ...params, enablejsapi: 1 }).map(([k, v]) => [k, String(v)])
  );
  return `${YT_ORIGIN}/embed/${id}?${query.toString()}`;
}

export function ytWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

// The IFrame API answers postMessage commands without loading the full JS API script.
export function ytCommand(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}
