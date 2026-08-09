import { prisma } from "@/lib/prisma";
import { ArticleForm } from "../ArticleForm";

export const metadata = { title: "Новая новость" };

export default async function NewArticlePage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { nameRu: "asc" }],
    select: { id: true, nameRu: true },
  });

  return <ArticleForm categories={categories} />;
}
