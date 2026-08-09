import sanitize from "sanitize-html";

/**
 * Очистка HTML из редактора админки по белому списку.
 *
 * Раньше здесь были регулярные выражения, и они пропускали, например,
 * `<a href=javascript:alert(1)>` без кавычек и `javas&#99;ript:` в виде
 * HTML-сущности. Теперь HTML разбирается парсером: всё, чего нет в списке,
 * удаляется, а схемы ссылок проверяются после декодирования сущностей.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  return sanitize(input, {
    allowedTags: [
      "p", "br", "hr",
      "h2", "h3", "h4",
      "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
      "span", "div",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      "*": ["class"],
    },
    // Только безопасные схемы: javascript:, data: и vbscript: не пройдут
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    // style не разрешаем вовсе: через него уходят url(javascript:…) и подобное
    allowedStyles: {},
    transformTags: {
      // Внешние ссылки не должны получать доступ к окну сайта
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank"
            ? { rel: "noopener noreferrer" }
            : { rel: attribs.rel ?? "noopener" }),
        },
      }),
    },
  }).trim();
}
