import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const CATEGORIES = [
  { nameUz: "Soliq qonunchiligi", nameRu: "Налоговое законодательство", nameEn: "Tax law", position: 1 },
  { nameUz: "Hisobot", nameRu: "Отчётность", nameEn: "Reporting", position: 2 },
  { nameUz: "QQS", nameRu: "НДС", nameEn: "VAT", position: 3 },
  { nameUz: "Biznes", nameRu: "Бизнес", nameEn: "Business", position: 4 },
  { nameUz: "Tushuntirishlar", nameRu: "Разъяснения", nameEn: "Clarifications", position: 5 },
];

const ARTICLES = [
  {
    titleRu: "Утверждены новые формы налоговой отчётности на 2026 год",
    titleUz: "2026 yil uchun soliq hisobotining yangi shakllari tasdiqlandi",
    titleEn: "New tax reporting forms approved for 2026",
    excerptRu:
      "Государственный налоговый комитет обновил формы расчётов по НДС и налогу на прибыль. Разбираем, что изменилось для бухгалтеров.",
    excerptUz:
      "Davlat soliq qo‘mitasi QQS va foyda solig‘i hisob-kitob shakllarini yangiladi. Buxgalterlar uchun nima o‘zgardi?",
    excerptEn:
      "The State Tax Committee has updated VAT and profit tax calculation forms. Here is what changed for accountants.",
    bodyRu:
      "<p>Новые формы применяются начиная с отчётности за первый квартал. Основные изменения касаются порядка отражения вычетов и структуры приложений.</p><h2>Что изменилось</h2><ul><li>Обновлена структура приложения к расчёту НДС.</li><li>Добавлены строки для операций с маркируемыми товарами.</li><li>Уточнён порядок отражения корректировок прошлых периодов.</li></ul><p>Бухгалтерам рекомендуется обновить учётные политики до конца текущего квартала.</p>",
    bodyUz:
      "<p>Yangi shakllar birinchi chorak hisobotidan boshlab qo‘llaniladi. Asosiy o‘zgarishlar chegirmalarni aks ettirish tartibiga tegishli.</p><h2>Nima o‘zgardi</h2><ul><li>QQS hisob-kitobiga ilova tuzilmasi yangilandi.</li><li>Markirovka qilinadigan tovarlar bo‘yicha qatorlar qo‘shildi.</li></ul>",
    bodyEn:
      "<p>The new forms apply starting with first-quarter reporting. The main changes concern how deductions are reported.</p><h2>What changed</h2><ul><li>The VAT calculation annex was restructured.</li><li>New lines were added for labelled goods.</li></ul>",
    featured: true,
    categoryIndex: 1,
  },
  {
    titleRu: "Ставка НДС: что учесть при переходе на новый порядок вычетов",
    titleUz: "QQS stavkasi: chegirmalarning yangi tartibiga o‘tishda nimani hisobga olish kerak",
    titleEn: "VAT rate: what to consider when switching to the new deduction rules",
    excerptRu:
      "Разбор практических ситуаций: авансы, длительные договоры и корректировочные счета-фактуры.",
    excerptUz: "Amaliy holatlar: avanslar, uzoq muddatli shartnomalar va tuzatish hisob-fakturalari.",
    excerptEn: "Practical cases: advances, long-term contracts and corrective invoices.",
    bodyRu:
      "<p>Переходный период требует внимания к договорам, заключённым до вступления изменений в силу.</p><blockquote>Ключевой критерий — дата фактической отгрузки, а не дата оплаты.</blockquote><p>Ниже — три типовые ситуации и порядок действий.</p>",
    bodyUz: "<p>O‘tish davri kuchga kirishdan oldin tuzilgan shartnomalarga e’tibor talab qiladi.</p>",
    bodyEn: "<p>The transition period requires attention to contracts signed before the changes took effect.</p>",
    categoryIndex: 2,
  },
  {
    titleRu: "Малый бизнес: новые лимиты для упрощённого режима",
    titleUz: "Kichik biznes: soddalashtirilgan tartib uchun yangi cheklovlar",
    titleEn: "Small business: new thresholds for the simplified regime",
    excerptRu: "Порог оборота пересмотрен — часть компаний сможет остаться на упрощённом режиме.",
    excerptUz: "Aylanma bo‘sag‘asi qayta ko‘rib chiqildi — bir qism kompaniyalar soddalashtirilgan tartibda qoladi.",
    excerptEn: "The turnover threshold has been revised — some companies will stay on the simplified regime.",
    bodyRu: "<p>Изменения затрагивают компании с оборотом вблизи порогового значения. Проверить свой статус можно в личном кабинете налогоплательщика.</p>",
    bodyUz: "<p>O‘zgarishlar bo‘sag‘aga yaqin aylanmaga ega kompaniyalarga taalluqli.</p>",
    bodyEn: "<p>The changes affect companies with turnover near the threshold.</p>",
    categoryIndex: 3,
  },
  {
    titleRu: "Разъяснение: как исправить ошибку в уже сданном расчёте",
    titleUz: "Tushuntirish: topshirilgan hisob-kitobdagi xatoni qanday tuzatish kerak",
    titleEn: "Clarification: how to fix an error in an already-filed calculation",
    excerptRu: "Пошаговый порядок подачи уточнённого расчёта и когда штраф не начисляется.",
    excerptUz: "Aniqlashtirilgan hisob-kitobni topshirish tartibi va jarima qo‘llanilmaydigan holatlar.",
    excerptEn: "Step-by-step filing of an amended calculation and when no penalty applies.",
    bodyRu: "<p>Если ошибка выявлена самостоятельно и налог доплачен до проверки, штраф не применяется.</p><h2>Порядок действий</h2><ol><li>Сформировать уточнённый расчёт.</li><li>Доплатить налог и пеню.</li><li>Отправить расчёт через личный кабинет.</li></ol>",
    bodyUz: "<p>Xato mustaqil aniqlansa va soliq tekshiruvdan oldin to‘lansa, jarima qo‘llanilmaydi.</p>",
    bodyEn: "<p>If the error is self-identified and the tax is paid before an audit, no penalty applies.</p>",
    categoryIndex: 4,
  },
];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@mytax.uz";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "mytax2026";

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Администратор",
      password: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
  });

  const categories = [];
  for (const c of CATEGORIES) {
    categories.push(
      await prisma.category.upsert({
        where: { slug: slugify(c.nameEn) },
        update: c,
        create: { ...c, slug: slugify(c.nameEn) },
      }),
    );
  }

  let daysAgo = 0;
  for (const a of ARTICLES) {
    const { categoryIndex, ...rest } = a;
    const slug = slugify(a.titleEn);
    const publishedAt = new Date(Date.now() - daysAgo * 86_400_000);
    daysAgo += 1;

    await prisma.article.upsert({
      where: { slug },
      update: {},
      create: {
        ...rest,
        slug,
        published: true,
        publishedAt,
        views: Math.floor(Math.random() * 900) + 50,
        authorId: admin.id,
        categoryId: categories[categoryIndex - 1]?.id ?? null,
      },
    });
  }

  console.log(`Готово. Вход в админку: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
