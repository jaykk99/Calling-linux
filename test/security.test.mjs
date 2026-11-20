// Fail-closed security tests for the inbound-SMS webhook and the Asterisk AMI
// client (Calling-linux server.ts).
//
// Spawns real server.ts copies in temp dirs (state stays out of the repo) and
// exercises the HTTP surface with node:test + fetch. Run: npm test.
//
// What is covered:
//   1. POST /api/webhooks/inbound-sms with no secret configured -> 503,
//      never accepted unsigned.
//   2. POST /api/calls/originate with AMI_SECRET unset -> 503, refused
//      before any AMI connection, never a fallback secret.
//   3. With CARRIER_HMAC_SECRET set: a valid HMAC -> 200, a wrong or
//      missing signature -> 401.
//   4. With AMI_SECRET set but no Asterisk running -> 503 "not running"
//      (fails honestly, no silent success).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TSX = path.join(CL_DIR, 'node_modules', '.bin', 'tsx');
const SECRET = 'test-only-hmac-secret';
const children = [];

async function waitUp(port, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/system/capabilities`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server on :${port} did not become healthy in ${timeoutMs}ms`);
}

async function boot(extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-sectest-'));
  fs.copyFileSync(path.join(CL_DIR, 'server.ts'), path.join(dir, 'server.ts'));
  fs.symlinkSync(path.join(CL_DIR, 'node_modules'), path.join(dir, 'node_modules'));
  const port = 32100 + Math.floor(Math.random() * 400);
  const env = { ...process.env };
  // Never inherit a real secret from the parent env; the test sets its own.
  delete env.CARRIER_HMAC_SECRET;
  delete env.AMI_SECRET;
  delete env.AMI_HOST;
  delete env.AMI_PORT;
  Object.assign(env, {
    PORT: String(port),
    SIP_PORT: '15061',
    SMTP_INBOUND_PORT: '12527',
    NODE_ENV: 'test',
  }, extraEnv);
  const child = spawn(TSX, ['server.ts'], {
    cwd: dir,
    env,
    // Detached so the whole process group (tsx wrapper + the node server it
    // spawns) can be killed together in after(). Killing only the wrapper
    // leaves the server alive holding the stdio pipes, and node --test then
    // never exits (seen live: 4/4 tests passed but the file hung 12 min).
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d.toString(); });
  try {
    await waitUp(port);
  } catch (err) {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { /* already dead */ } }
    throw new Error(`${err.message}\nserver stderr:\n${stderr.slice(-3000)}`);
  }
  return { child, port, dir };
}

after(() => {
  for (const child of children) {
    // Kill the whole process group (tsx wrapper + node server); killing the
    // wrapper alone orphans the server.
    try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { /* already dead */ } }
  }
});

function hmacSig(secret, rawBody) {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
}

test('webhook refuses unsigned SMS when no secret is configured', async () => {
  const { port } = await boot();
  const res = await fetch(`http://127.0.0.1:${port}/api/webhooks/inbound-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromPhone: '+12015550001', body: 'unsigned test 123456' }),
  });
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.match(data.error, /not configured/);
});

test('originate refuses when AMI_SECRET is unset', async () => {
  const { port } = await boot();
  const res = await fetch(`http://127.0.0.1:${port}/api/calls/originate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromNumber: '+12015550001', toPhone: '+12015550002' }),
  });
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.match(data.error, /AMI_SECRET/);
  assert.equal(data.call.status, 'failed');
});

test('webhook accepts a valid HMAC and rejects bad or missing signatures', async () => {
  const { port } = await boot({ CARRIER_HMAC_SECRET: SECRET });
  const url = `http://127.0.0.1:${port}/api/webhooks/inbound-sms`;
  const payload = { fromPhone: '+12015550001', body: 'signed test 123456' };
  const raw = JSON.stringify(payload);

  const ok = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Carrier-Signature-256': hmacSig(SECRET, raw) },
    body: raw,
  });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).success, true);

  const bad = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Carrier-Signature-256': 'sha256=deadbeef' },
    body: raw,
  });
  assert.equal(bad.status, 401);

  const missing = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw,
  });
  assert.equal(missing.status, 401);
});

test('originate with a configured secret fails honestly when AMI is not running', async () => {
  const { port } = await boot({ AMI_SECRET: SECRET, AMI_HOST: '127.0.0.1', AMI_PORT: '5038' });
  const res = await fetch(`http://127.0.0.1:${port}/api/calls/originate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromNumber: '+12015550001', toPhone: '+12015550002' }),
  });
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.match(data.error, /not running/);
  assert.equal(data.amiConnected, false);
});
