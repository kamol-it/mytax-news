import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ArticleForm } from "../ArticleForm";

export const metadata = { title: "Редактирование новости" };

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [article, categories] = await Promise.all([
    prisma.article.findUnique({ where: { id } }),
    prisma.category.findMany({
      orderBy: [{ position: "asc" }, { nameRu: "asc" }],
      select: { id: true, nameRu: true },
    }),
  ]);

  if (!article) notFound();

  return <ArticleForm categories={categories} values={article} />;
}
