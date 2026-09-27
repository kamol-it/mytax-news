import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIpFromHeaders } from "./client-ip";

const h = (values: Record<string, string>) => new Headers(values);

test("предпочитает X-Real-IP (nginx, Vercel)", () => {
  assert.equal(
    clientIpFromHeaders(h({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 203.0.113.7" })),
    "203.0.113.7",
  );
});

test("без X-Real-IP берёт последний адрес X-Forwarded-For, а не подделанный первый", () => {
  assert.equal(
    clientIpFromHeaders(h({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 198.51.100.4" })),
    "198.51.100.4",
  );
  assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": "198.51.100.4" })), "198.51.100.4");
});

test("мусор в заголовках не становится ключом лимита", () => {
  assert.equal(clientIpFromHeaders(h({ "x-real-ip": "random-" + "x".repeat(500) })), "unknown");
  assert.equal(
    clientIpFromHeaders(h({ "x-real-ip": "garbage", "x-forwarded-for": "1.1.1.1, 192.0.2.1" })),
    "192.0.2.1",
  );
  assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": "1.1.1.1, nonsense" })), "unknown");
  assert.equal(clientIpFromHeaders(h({})), "unknown");
});

test("понимает IPv6 и адрес с портом", () => {
  assert.equal(clientIpFromHeaders(h({ "x-real-ip": "2001:DB8::1" })), "2001:db8::1");
  assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": "[2001:db8::2]:443" })), "2001:db8::2");
  assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": "192.0.2.5:5678" })), "192.0.2.5");
});
