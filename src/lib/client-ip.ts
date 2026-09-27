import { isIP } from "node:net";

type HeaderSource = { get(name: string): string | null };

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  let ip = value.trim();
  // IPv6 в квадратных скобках и IPv4 с портом ("1.2.3.4:5678")
  if (ip.startsWith("[") && ip.includes("]")) ip = ip.slice(1, ip.indexOf("]"));
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(":"));
  return isIP(ip) ? ip.toLowerCase() : null;
}

/**
 * IP посетителя для лимитов частоты запросов.
 *
 * Первый элемент X-Forwarded-For задаёт сам клиент, поэтому ему верить нельзя:
 * подставляя случайные адреса, можно обойти любой лимит. Берём адрес,
 * который выставил доверенный прокси:
 *
 * 1. X-Real-IP — nginx из deploy/nginx.conf.example пишет туда $remote_addr,
 *    Vercel перезаписывает его реальным адресом клиента;
 * 2. иначе последний элемент X-Forwarded-For — его добавил ближайший прокси.
 *
 * Без заголовков возвращаем «unknown»: лимит становится общим для всех.
 */
export function clientIpFromHeaders(headers: HeaderSource): string {
  const real = normalize(headers.get("x-real-ip"));
  if (real) return real;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const last = normalize(forwarded.split(",").at(-1));
    if (last) return last;
  }
  return "unknown";
}
