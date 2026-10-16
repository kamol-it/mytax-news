import Link from "next/link";

/** Короткая подсказка под полем формы. `more` — якорь раздела «Справка». */
export function Hint({ children, more }: { children: React.ReactNode; more?: string }) {
  return (
    <p className="mt-1 text-xs leading-relaxed text-muted">
      {children}
      {more ? (
        <>
          {" "}
          <Link href={`/admin/help#${more}`} className="whitespace-nowrap text-ink hover:text-accent">
            Подробнее →
          </Link>
        </>
      ) : null}
    </p>
  );
}
