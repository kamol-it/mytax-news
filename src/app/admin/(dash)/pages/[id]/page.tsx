import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageForm } from "../PageForm";

export const metadata = { title: "Редактирование страницы" };

export default async function EditStaticPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  return <PageForm values={page} />;
}
