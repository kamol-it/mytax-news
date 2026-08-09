import { getSocialLinks } from "@/lib/settings";

const paths: Record<string, string> = {
  social_telegram:
    "M21.9 4.3 19 19.2c-.2 1-.8 1.2-1.6.8l-4.4-3.3-2.1 2c-.2.2-.4.4-.9.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.6-.2L7.8 13.2 3.4 11.8c-1-.3-1-1 .2-1.4l17-6.6c.8-.3 1.5.2 1.3 1.5Z",
  social_instagram:
    "M12 2.2c-2.7 0-3 0-4 .1-1.1 0-1.8.2-2.4.5-.7.2-1.2.6-1.7 1.1S3 4.9 2.8 5.6c-.3.6-.4 1.3-.5 2.4 0 1-.1 1.3-.1 4s0 3 .1 4c0 1.1.2 1.8.5 2.4.2.7.6 1.2 1.1 1.7s1 .9 1.7 1.1c.6.3 1.3.4 2.4.5 1 0 1.3.1 4 .1s3 0 4-.1c1.1 0 1.8-.2 2.4-.5.7-.2 1.2-.6 1.7-1.1s.9-1 1.1-1.7c.3-.6.4-1.3.5-2.4 0-1 .1-1.3.1-4s0-3-.1-4c0-1.1-.2-1.8-.5-2.4a4.6 4.6 0 0 0-1.1-1.7 4.6 4.6 0 0 0-1.7-1.1c-.6-.3-1.3-.4-2.4-.5-1 0-1.3-.1-4-.1Zm0 1.8c2.7 0 2.9 0 4 .1.9 0 1.3.2 1.7.3.4.2.7.4 1 .7.3.3.5.6.7 1 .1.4.3.8.3 1.7.1 1.1.1 1.3.1 4s0 2.9-.1 4c0 .9-.2 1.3-.3 1.7-.2.4-.4.7-.7 1-.3.3-.6.5-1 .7-.4.1-.8.3-1.7.3-1.1.1-1.3.1-4 .1s-2.9 0-4-.1c-.9 0-1.3-.2-1.7-.3-.4-.2-.7-.4-1-.7-.3-.3-.5-.6-.7-1-.1-.4-.3-.8-.3-1.7-.1-1.1-.1-1.3-.1-4s0-2.9.1-4c0-.9.2-1.3.3-1.7.2-.4.4-.7.7-1 .3-.3.6-.5 1-.7.4-.1.8-.3 1.7-.3 1.1-.1 1.3-.1 4-.1Zm0 3.1a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm6.4-8.4a1.2 1.2 0 1 1-2.3 0 1.2 1.2 0 0 1 2.3 0Z",
  social_facebook:
    "M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.2-1.5 1.5-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H7.6V13h2.7v8h3.2Z",
  social_youtube:
    "M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15.2V8.8l5.2 3.2-5.2 3.2Z",
  social_x:
    "M17.5 3h3.3l-7.2 8.2L21.5 21h-6l-4.4-5.8L5.9 21H2.6l7.6-8.7L2.8 3h6.1l4.1 5.4L17.5 3Zm-1.1 16h1.8L7.4 4.8H5.5L16.4 19Z",
};

export async function SocialLinks({
  className = "",
  size = "md",
  tone = "dark",
}: {
  className?: string;
  size?: "sm" | "md";
  /** dark — иконки на синем фоне, light — на белом */
  tone?: "dark" | "light";
}) {
  const links = await getSocialLinks();
  if (links.length === 0) return null;

  const box = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map((link) => (
        <a
          key={link.key}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className={`flex ${box} items-center justify-center rounded-full border transition ${
            tone === "dark"
              ? "border-white/15 text-white/75 hover:bg-white/10 hover:text-white"
              : "border-line text-muted hover:border-accent hover:text-accent"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className={icon} aria-hidden="true">
            <path d={paths[link.key] ?? ""} />
          </svg>
        </a>
      ))}
    </div>
  );
}
