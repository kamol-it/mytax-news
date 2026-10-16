import assert from "node:assert/strict";
import { test } from "node:test";
import { routeByHost } from "./admin-host";

const base = { search: "", adminHost: "in.mytax.uz", siteUrl: "https://mytax.uz" };

test("без ADMIN_HOST ничего не меняется", () => {
  for (const pathname of ["/admin", "/admin/login", "/ru"]) {
    assert.deepEqual(
      routeByHost({ ...base, adminHost: null, host: "mytax.uz", pathname }),
      { action: "next" },
    );
  }
});

test("на основном домене /admin не существует", () => {
  for (const pathname of ["/admin", "/admin/login", "/admin/articles"]) {
    assert.deepEqual(routeByHost({ ...base, host: "mytax.uz", pathname }), { action: "not-found" });
  }
  // похожие публичные пути не задеваем
  assert.deepEqual(routeByHost({ ...base, host: "mytax.uz", pathname: "/administration" }), {
    action: "next",
  });
  assert.deepEqual(routeByHost({ ...base, host: "www.mytax.uz", pathname: "/ru" }), { action: "next" });
});

test("на поддомене открывается админка", () => {
  assert.deepEqual(routeByHost({ ...base, host: "in.mytax.uz", pathname: "/" }), {
    action: "redirect",
    url: "/admin",
  });
  assert.deepEqual(routeByHost({ ...base, host: "IN.mytax.uz:443", pathname: "/admin/login" }), {
    action: "next",
  });
});

test("публичные страницы с поддомена уводят на основной сайт", () => {
  assert.deepEqual(
    routeByHost({ ...base, host: "in.mytax.uz", pathname: "/ru/news/x", search: "?a=1" }),
    { action: "redirect", url: "https://mytax.uz/ru/news/x?a=1" },
  );
});
