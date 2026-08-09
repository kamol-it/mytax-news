import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { prisma } from "@/lib/prisma";
import { deleteCategory, saveCategory } from "../../actions";

export const metadata = { title: "Рубрики" };

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { nameRu: "asc" }],
    include: { _count: { select: { articles: true } } },
  });

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Рубрики</h1>

      <form action={saveCategory} className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
          Новая рубрика
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input name="nameUz" placeholder="Nomi (uz)" className={field} />
          <input name="nameRu" placeholder="Название (ru)" className={field} />
          <input name="nameEn" placeholder="Name (en)" className={field} />
          <input name="position" type="number" placeholder="Порядок" className={field} />
        </div>
        <button
          type="submit"
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Добавить
        </button>
      </form>

      <div className="space-y-3">
        {categories.length === 0 ? (
          <p className="text-sm text-muted">Рубрик пока нет.</p>
        ) : (
          categories.map((c) => (
            <form
              key={c.id}
              action={saveCategory}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <input type="hidden" name="id" value={c.id} />
              <div className="grid gap-3 sm:grid-cols-4">
                <input name="nameUz" defaultValue={c.nameUz} className={field} />
                <input name="nameRu" defaultValue={c.nameRu} className={field} />
                <input name="nameEn" defaultValue={c.nameEn} className={field} />
                <input
                  name="position"
                  type="number"
                  defaultValue={c.position}
                  className={field}
                />
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                <code>/{c.slug}</code>
                <span>{c._count.articles} новостей</span>
                <button
                  type="submit"
                  className="ml-auto rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-accent hover:text-accent"
                >
                  Сохранить
                </button>
              </div>
              <div className="mt-2 text-right">
                <ConfirmSubmit
                  message={`Удалить рубрику «${c.nameRu}»? Новости останутся, но потеряют рубрику.`}
                  formAction={deleteCategory}
                  className="text-xs text-muted hover:text-accent"
                >
                  Удалить рубрику
                </ConfirmSubmit>
              </div>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
