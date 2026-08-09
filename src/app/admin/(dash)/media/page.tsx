import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatDate } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { deleteMedia } from "../../actions";

export const metadata = { title: "Медиафайлы" };

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default async function MediaPage() {
  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-5 text-2xl font-black">Медиафайлы</h1>

      {media.length === 0 ? (
        <p className="text-sm text-muted">
          Файлов нет. Они появляются здесь после загрузки из редактора новости.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              {m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <video src={m.url} controls preload="metadata" className="aspect-video w-full bg-black" />
              )}
              <div className="p-3 text-xs text-muted">
                <p className="truncate font-medium text-foreground" title={m.filename}>
                  {m.filename}
                </p>
                <p className="mt-1">
                  {humanSize(m.size)} · {formatDate(m.createdAt, "ru")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <a href={m.url} target="_blank" className="hover:text-accent">
                    Открыть
                  </a>
                  <form action={deleteMedia} className="ml-auto">
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmSubmit
                      message="Удалить файл с сервера?"
                      className="hover:text-accent"
                    >
                      Удалить
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
