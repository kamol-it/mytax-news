export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline text-2xl font-black tracking-tight ${className}`}
    >
      <span className="text-accent">MY</span>
      <span className="text-white/85">TAX</span>
    </span>
  );
}
