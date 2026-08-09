/**
 * Минимальная очистка HTML из редактора админки.
 * Админ — доверенный автор, но убираем то, что может выполнить код,
 * чтобы скомпрометированная учётка не превращалась в XSS на всём сайте.
 */
const BLOCKED_TAGS = ["script", "style", "iframe", "object", "embed", "form", "link", "meta"];

export function sanitizeHtml(input: string): string {
  let html = input;

  for (const tag of BLOCKED_TAGS) {
    html = html.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"),
      "",
    );
    html = html.replace(new RegExp(`<${tag}\\b[^>]*/?>`, "gi"), "");
  }

  // on*-атрибуты: onclick="…", onerror='…', onload=…
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // javascript:-ссылки
  html = html.replace(
    /(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi,
    '$1="#"',
  );

  return html.trim();
}
