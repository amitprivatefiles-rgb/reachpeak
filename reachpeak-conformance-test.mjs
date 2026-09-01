#!/usr/bin/env node
/**
 * ReachPeak partner-* CONFORMANCE TEST
 * See implementation_plan.md §3.3 for usage.
 */

const BASE = (process.env.REACHPEAK_API_URL || '').replace(/\/$/, '');
const KEY = process.env.RP_TEST_KEY || '';
const SECRET = process.env.PARTNER_PROVISION_SECRET || '';
const RUN_PROVISION = process.env.RUN_PROVISION === '1';
const TEST_PHONE = process.env.RP_TEST_PHONE || '+919999999999';

if (!BASE) { console.error('FATAL: set REACHPEAK_API_URL'); process.exit(2); }
if (!KEY) { console.error('FATAL: set RP_TEST_KEY'); process.exit(2); }

let passed = 0, failed = 0, warned = 0;
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m';
function ok(m)   { passed++; console.log(`${G}  PASS${X} ${m}`); }
function bad(m)  { failed++; console.log(`${R}  FAIL${X} ${m}`); }
function warn(m) { warned++; console.log(`${Y}  WARN${X} ${m}`); }
function head(m) { console.log(`\n${C}== ${m} ==${X}`); }

async function call(method, endpoint, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.bearer) headers['Authorization'] = `Bearer ${opts.bearer}`;
  if (opts.secret) headers['X-Partner-Secret'] = opts.secret;
  const fetchOpts = { method, headers };
  if (opts.body) fetchOpts.body = JSON.stringify(opts.body);
  const res = await fetch(`${BASE}/${endpoint}`, fetchOpts);
  let data = {};
  try { data = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, data };
}

async function testHealth() {
  head('partner-health');
  const r = await call('GET', 'partner-health', { bearer: KEY });
  r.status === 200 ? ok('200') : bad(`expected 200 got ${r.status}`);
  for (const f of ['waba_status','quality_rating','messaging_tier'])
    r.data?.[f] !== undefined ? ok(f) : warn(`missing ${f}`);
}

async function testAuth() {
  head('auth rejection');
  const r = await call('GET', 'partner-health', { bearer: 'rpk_live_invalid' });
  (r.status===401||r.status===403) ? ok(`rejected ${r.status}`) : bad(`expected 401/403 got ${r.status}`);
}

async function testSend() {
  head('partner-send template (dry_run)');
  const idem = `conformance:${Date.now()}`;
  const body = { to: TEST_PHONE, type: 'template', template: { name: 'order_confirmation', language: 'en', bodyParams: ['Test','#1000'], buttonParams: [] }, idempotency_key: idem, external_ref: { type:'order', id:'conformance' }, contact: { name:'Test' }, dry_run: true };
  const r = await call('POST', 'partner-send', { bearer: KEY, body });
  (r.status===200||r.status===201) ? ok(`${r.status}`) : r.status===422 ? warn(`422 ${r.data.error_bucket||r.data.error}`) : bad(`expected 200/201 got ${r.status}`);
  if (r.ok && (r.data?.message_id||r.data?.id)) ok('has message_id/id'); else if (r.ok) bad('missing message_id/id');
  const r2 = await call('POST', 'partner-send', { bearer: KEY, body });
  (r2.status===200||r2.status===409) ? ok(`idempotency ${r2.status}`) : warn(`idempotency got ${r2.status}`);
}

async function testValidation() {
  head('partner-send validation');
  const r = await call('POST', 'partner-send', { bearer: KEY, body: { type:'template', dry_run:true } });
  r.status===422 ? ok('422 for missing to') : warn(`expected 422 got ${r.status}`);
}

async function testIngest() {
  head('ingest-event');
  const r = await call('POST', 'ingest-event', { bearer: KEY, body: { event_type:'order_created', dedupe_key:`ct:${Date.now()}`, contact:{phone:TEST_PHONE,name:'T'}, payload:{}, dry_run:true } });
  (r.status>=200&&r.status<300) ? ok(`${r.status}`) : r.status===422 ? warn('422') : bad(`expected 2xx got ${r.status}`);
}

async function testCallbacksGet() {
  head('partner-callbacks GET');
  const r = await call('GET', `partner-callbacks?since=${new Date(Date.now()-3600000).toISOString()}`, { bearer: KEY });
  r.status===200 ? ok('200') : bad(`expected 200 got ${r.status}`);
  Array.isArray(r.data?.callbacks) ? ok('has callbacks[]') : bad('missing callbacks array');
}

async function testCallbacksAck() {
  head('partner-callbacks POST ack');
  const r = await call('POST', 'partner-callbacks', { bearer: KEY, body: { callback_ids: ['nonexistent'] } });
  (r.status>=200&&r.status<300) ? ok(`ack ${r.status}`) : bad(`ack expected 2xx got ${r.status}`);
}

async function testProvision() {
  head('partner-provision');
  if (!RUN_PROVISION) { warn('skipped (RUN_PROVISION=0)'); return; }
  if (!SECRET) { bad('no PARTNER_PROVISION_SECRET'); return; }
  const bad1 = await call('POST', 'partner-provision', { secret:'wrong', body:{external_store_id:'x',store_name:'x',owner_email:'x@x.com'} });
  (bad1.status===401||bad1.status===403) ? ok(`wrong secret rejected ${bad1.status}`) : bad(`wrong secret got ${bad1.status}`);
  const r = await call('POST', 'partner-provision', { secret: SECRET, body: { external_store_id:`ct-${Date.now()}`, store_name:'Conformance', owner_email:process.env.RP_TEST_EMAIL||'test@example.com' } });
  (r.ok&&r.data?.success===true) ? ok('success:true') : bad(`expected success:true got ${r.status}`);
  r.data?.api_key ? ok('has api_key') : bad('missing api_key');
}

(async () => {
  console.log(`\n${C}ReachPeak conformance test${X}\nTarget: ${BASE}\nProvision: ${RUN_PROVISION?'ON':'off'}`);
  await testHealth(); await testAuth(); await testSend(); await testValidation();
  await testIngest(); await testCallbacksGet(); await testCallbacksAck(); await testProvision();
  console.log(`\n${C}====== SUMMARY ======${X}\n${G}PASS:${passed}${X} ${R}FAIL:${failed}${X} ${Y}WARN:${warned}${X}`);
  failed===0 ? console.log(`${G}\n✔ CONFORMANT${X}`) : console.log(`${R}\n✘ ${failed} violation(s)${X}`);
  process.exit(failed>0?1:0);
})();
