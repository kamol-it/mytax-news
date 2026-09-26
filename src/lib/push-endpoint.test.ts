import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidPushEndpoint, isValidPushKeys } from "./push-endpoint";

// Настоящие по формату ключи: 65 байт (начинается с 0x04) и 16 байт в base64url
const P256DH = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url");
const AUTH = Buffer.alloc(16, 9).toString("base64url");

test("принимает endpoint-ы push-сервисов браузеров", () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/abc:APA91b",
    "https://android.googleapis.com/gcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAAA",
    "https://eu.push.services.mozilla.com/wpush/v2/x",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
    "https://web.push.apple.com/QGuQyavXutnMH",
    "https://api.push.apple.com/3/device/abc",
    "https://FCM.googleapis.com:443/fcm/send/x",
  ]) {
    assert.equal(isValidPushEndpoint(endpoint), true, endpoint);
  }
});

test("отклоняет посторонние и внутренние адреса", () => {
  for (const endpoint of [
    undefined,
    "",
    "not a url",
    "http://fcm.googleapis.com/fcm/send/x", // не https
    "https://127.0.0.1/",
    "https://localhost:3000/api",
    "https://169.254.169.254/latest/meta-data/",
    "https://evil.com/fcm.googleapis.com",
    "https://fcm.googleapis.com.evil.com/x",
    "https://evilnotify.windows.com/x", // нет точки перед суффиксом
    "https://notify.windows.com/x", // сам суффикс без поддомена
    "https://push.apple.com.attacker.net/x",
    "https://user:pass@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "file:///etc/passwd",
    `https://fcm.googleapis.com/${"a".repeat(3000)}`,
  ]) {
    assert.equal(isValidPushEndpoint(endpoint), false, String(endpoint));
  }
});

test("проверяет формат ключей подписки", () => {
  assert.equal(isValidPushKeys(P256DH, AUTH), true);
  // с паддингом и в обычном base64 — тоже допустимо
  assert.equal(
    isValidPushKeys(Buffer.from(P256DH, "base64url").toString("base64"), AUTH + "=="),
    true,
  );

  assert.equal(isValidPushKeys(undefined, AUTH), false);
  assert.equal(isValidPushKeys(P256DH, undefined), false);
  assert.equal(isValidPushKeys("short", AUTH), false);
  assert.equal(isValidPushKeys(P256DH, "short"), false);
  assert.equal(isValidPushKeys(P256DH, "!!!!invalid!!!!invalid!"), false);
  // 65 байт, но не несжатая точка
  const wrongPrefix = Buffer.concat([Buffer.from([2]), Buffer.alloc(64, 7)]).toString("base64url");
  assert.equal(isValidPushKeys(wrongPrefix, AUTH), false);
  assert.equal(isValidPushKeys(P256DH + "A".repeat(200), AUTH), false);
});
