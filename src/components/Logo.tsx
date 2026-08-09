/**
 * Логотип MYTAX MEDIA, собранный вёрсткой: «MY» красным, «TAX» тёмным,
 * под ними полоса и разряжённое «MEDIA».
 * tone="dark" — для синего фона (подвал, боковое меню админки).
 */
export function Logo({
  className = "",
  tone = "light",
  size = "md",
}: {
  className?: string;
  tone?: "light" | "dark";
  size?: "sm" | "md";
}) {
  const solid = tone === "dark" ? "text-white" : "text-ink-dark";
  const bar = tone === "dark" ? "bg-white/90" : "bg-ink-dark";
  const wordmark = size === "sm" ? "text-xl" : "text-[26px]";
  const sub = size === "sm" ? "text-[8px]" : "text-[10px]";

  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className={`font-black tracking-tight ${wordmark}`}>
        <span className="text-accent">MY</span>
        <span className={solid}>TAX</span>
      </span>
      <span className="mt-1 flex items-center gap-1.5">
        <span className={`h-[3px] flex-1 rounded-sm ${bar}`} />
        <span className={`font-semibold tracking-[0.3em] text-accent ${sub}`}>MEDIA</span>
      </span>
    </span>
  );
}
