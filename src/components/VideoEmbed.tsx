/** Показывает либо загруженный видеофайл, либо встроенный плеер YouTube. */
export function VideoEmbed({ url, title }: { url: string; title?: string }) {
  const youTubeId = extractYouTubeId(url);

  if (youTubeId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youTubeId}`}
          title={title ?? "video"}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <video
      controls
      preload="metadata"
      className="w-full rounded-lg bg-black"
      src={url}
    />
  );
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts)\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}
