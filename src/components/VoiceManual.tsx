// Admin operator manual for AI Calling on Plivo (shown in AI Calling Setup → Manual).
import { ReactNode } from 'react';

const ACCENT = '#E04632';
const H = ({ id, n, children }: { id: string; n?: string; children: ReactNode }) => (
  <h2 id={id} style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '28px 0 8px', fontFamily: "'Space Grotesk', sans-serif", scrollMarginTop: 80 }}>
    {n && <span style={{ color: ACCENT, marginRight: 8 }}>{n}</span>}{children}
  </h2>
);
const P = ({ children }: { children: ReactNode }) => <p style={{ margin: '6px 0', fontSize: 14, lineHeight: 1.65, color: '#334155', maxWidth: '72ch' }}>{children}</p>;
const Steps = ({ items }: { items: ReactNode[] }) => (
  <ol style={{ margin: '6px 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.65, color: '#334155', maxWidth: '72ch' }}>{items.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}</ol>
);
const Note = ({ kind = 'tip', children }: { kind?: 'tip' | 'warn'; children: ReactNode }) => (
  <div style={{ margin: '10px 0', padding: '10px 12px', borderRadius: 10, fontSize: 13.5, lineHeight: 1.55, maxWidth: '76ch', background: kind === 'warn' ? '#fffbeb' : '#f0f9ff', color: kind === 'warn' ? '#92400e' : '#075985', border: '1px solid ' + (kind === 'warn' ? '#fde68a' : '#bae6fd') }}>{children}</div>
);
const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div style={{ overflowX: 'auto', margin: '8px 0' }}>
    <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 560, width: '100%' }}>
      <thead><tr>{head.map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top', color: '#334155' }}>{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);
const B = ({ children }: { children: ReactNode }) => <b style={{ color: '#0f172a' }}>{children}</b>;

const TOC = [
  ['how', 'How AI Calling works'], ['before', 'Before you start (one time)'], ['s1', 'Step 1 · Connect Plivo'], ['s2', 'Step 2 · Set up the Plivo app'],
  ['s3', 'Step 3 · Rent, sync and link numbers'], ['req', 'Requests from businesses'], ['s4', 'Step 4 · Create the agent'], ['s5', 'Step 5 · Assign the number'], ['s6', 'Step 6 · Account calling rules'],
  ['s7', 'Step 7 · Test before go-live'], ['s8', 'Step 8 · Go live'], ['ops', 'Daily operations'], ['money', 'Pricing, billing and margins'],
  ['comp', 'Compliance (India / TRAI)'], ['sec', 'Security'], ['trouble', 'Troubleshooting'], ['faq', 'FAQ'],
];

export function VoiceManual() {
  return (
    <div className="rp-card" style={{ borderRadius: 16, padding: '20px 22px' }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', fontFamily: "'Space Grotesk', sans-serif" }}>AI Calling: Admin Manual</h1>
      <Note><B>Fastest path for one business:</B> AI Calling Setup → <B>Accounts</B> → <B>Set up</B> on that business. One screen covers access, agents, phone number, outgoing rules, price & limits and their WhatsApp/wallet status, with a checklist of what is still missing.</Note>
      <P>Everything the ReachPeak admin needs to connect Plivo, give any business a working AI phone line, and run it day to day. Only admins can do this setup; businesses only create their agents, test them and (if you allow it) place outgoing calls.</P>

      <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '12px 0 4px' }}>
        {TOC.map(([id, label]) => <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }} style={{ fontSize: 12.5, padding: '5px 10px', borderRadius: 999, background: '#f1f5f9', color: '#334155', textDecoration: 'none' }}>{label}</a>)}
      </nav>

      <H id="how">How AI Calling works</H>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 14, borderRadius: 12, fontSize: 12.5, overflowX: 'auto', lineHeight: 1.6 }}>{`Customer's phone ⇄ Plivo (Indian number) ⇄ voice.reachpeak.in (ReachPeak voice server) ⇄ Google Gemini Live (the AI voice)
                                                   │
                                                   ├─ reads: which account + agent owns the number, account rules, wallet
                                                   └─ writes: call log + transcript, wallet charge, lead, "call_completed" event → WhatsApp journeys`}</pre>
      <Steps items={[
        <>A customer dials a business's number (or the AI dials the customer). <B>Plivo</B> carries the phone audio.</>,
        <>Plivo asks our voice server what to do. The server looks up the number in <B>Numbers</B>, finds the <B>account</B> and the <B>agent</B>, checks the account's <B>rules</B> (AI Calling switched on, line limit, minute cap) and <B>reserves wallet tokens</B> for the maximum call length.</>,
        <>The AI talks to the customer using that agent's brief (business facts, slots, purpose). It books, confirms, takes callbacks, and hangs up politely.</>,
        <>When the call ends, the wallet is charged only for the minutes used, the call (summary, outcome, transcript) appears in the business's <B>Call logs</B>, inbound callers become <B>Leads</B> (non-e-commerce businesses), and an <B>"After AI call"</B> WhatsApp journey can send a confirmation.</>,
        <>Plivo then reports its own billing (seconds, cost, why the call ended) which you see in the <B>Calls</B> tab.</>,
      ]} />

      <H id="before">Before you start (one time)</H>
      <Steps items={[
        <><B>Plivo account:</B> sign up at plivo.com → choose "Build Your Voice Agent Programmatically" → Gemini Live.</>,
        <><B>India KYC</B> in Plivo: certificate of incorporation, GST, INR billing address. Indian numbers can only be rented after KYC is approved.</>,
        <><B>Add balance</B> in Plivo (Billing → Add credits). Calls stop if the Plivo balance hits zero, even if businesses have wallet tokens.</>,
        <><B>Costs to know:</B> about ₹0.38/min for calls (in or out, 30-second billing pulse) and about ₹200/month per Indian number. Live audio streaming is included.</>,
      ]} />

      <H id="s1" n="1">Connect Plivo</H>
      <Steps items={[
        <>Plivo console → <B>Overview</B> → copy <B>Auth ID</B> and <B>Auth Token</B>.</>,
        <>Here: <B>Connection</B> tab → paste both → <B>Connect Plivo</B>. We check them with Plivo immediately; you see the account name and Plivo balance.</>,
        <>The token is stored encrypted (Supabase Vault). It is never shown again, never sent to browsers, and not visible to businesses.</>,
      ]} />
      <Note>Changed the token in Plivo? Click <B>Change credentials</B> and paste the new one, or calls will stop working.</Note>

      <H id="s2" n="2">Set up the Plivo app</H>
      <P>Click <B>Set up Plivo app</B>. This creates one Plivo Application called "ReachPeak AI Voice" with our <B>Answer URL</B> (what to do when a call connects) and <B>Hangup URL</B> (call ended, billing). The URLs contain a secret, so outsiders cannot fake calls.</P>
      <Note kind="warn">Do not edit these URLs by hand in the Plivo console. If anything changes (new server address, rotated secret), press <B>Re-apply app settings</B> and we update Plivo for you.</Note>

      <H id="s3" n="3">Rent, sync and link numbers</H>
      <Steps items={[
        <>Plivo console → <B>Phone Numbers → Buy Number</B> → country India → a <B>voice-enabled</B> number (local/landline-style or mobile as available). Rent one per business (or one shared demo line).</>,
        <>Here: <B>Numbers</B> tab → <B>Sync from Plivo</B>. Every number on the account appears with type, region and monthly rent.</>,
        <>For each number click <B>Link to app</B>. The number now rings ReachPeak AI. Status shows <B>Linked</B>.</>,
      ]} />
      <Note>A number shown as <B>Removed from Plivo</B> was un-rented in the console. Its calls stop; unassign it and assign a new number.</Note>

      <H id="req">AI Calling requests from businesses</H>
      <P>AI Calling is <B>off</B> for every business until you switch it on. Businesses without access see a <B>Request AI Calling</B> page (what the AI should handle, incoming/outgoing, expected minutes, their phone). Each request notifies all admins and appears at the top of the <B>Accounts</B> tab. Press <B>Set up</B>, complete the checklist, then <B>Switch AI Calling on & approve request</B>, or decline with a note the business can read.</P>

      <H id="s4" n="4">Create the agent</H>
      <P>Each number is answered by an <B>agent</B> that belongs to one business. You create it for them: <B>Accounts</B> → <B>Set up</B> → <B>Create / edit / test agents</B>. (Once AI Calling is on, the business can also edit its own agents.)</P>
      <Steps items={[
        <><B>Business name</B> and the <B>agent's name</B> (how it introduces itself), a <B>voice</B>.</>,
        <><B>What the call should achieve</B> (book appointments, confirm orders, qualify leads, support, payment reminders).</>,
        <><B>Brief</B>: the only facts the AI may use: services, prices, timings, address, policies. Anything not written here, the AI says the team will confirm on WhatsApp. It never invents prices.</>,
        <><B>Available slots</B> (weekly) and any <B>extra instructions</B> (e.g. "speak mostly Bengali").</>,
        <><B>Calls it handles</B>: incoming, outgoing or both. An incoming number needs an agent that handles incoming calls.</>,
        <>Press <B>Test call</B> and talk to it in the browser. Fix the brief until the answers are right.</>,
      ]} />

      <H id="s5" n="5">Assign the number</H>
      <P><B>Accounts</B> → <B>Set up</B> → <B>Phone numbers</B> → pick a free number and the agent → <B>Assign</B> (an unlinked number is linked to the Plivo app automatically). The <B>Numbers</B> tab shows every number and can do the same. From that moment, calls to the number are answered by that agent and billed to that account's wallet. The business sees the number on its agent card.</P>
      <Note>Unassigned numbers (or a paused / outgoing-only agent) answer with: "Sorry, this number is not active yet." Nothing is billed.</Note>

      <H id="s6" n="6">Account calling rules</H>
      <Table head={['Rule', 'What it does', 'Default']} rows={[
        [<B>AI Calling access</B>, 'Master switch for the account. Off = the business sees a "Request AI Calling" page and its number answers "not available". Admins can still test agents while it is off.', 'Off'],
        [<B>Allow outgoing AI calls</B>, 'Shows "Call a customer" in the business dashboard and "Call with AI" on leads. Needs a caller number and a compliance note.', 'Off'],
        [<B>Caller number</B>, 'Which of the account’s numbers the AI calls from.', '—'],
        [<B>Compliance note</B>, 'Record of what was confirmed (number series, consent basis, Plivo ticket).', '—'],
        [<B>Price per minute</B>, 'Overrides the platform price (Billing → AI call per minute) for this account only.', 'Platform price (₹4.00)'],
        [<B>Max calls at once</B>, 'Simultaneous calls for the account. Extra callers hear "all lines are busy".', '3'],
        [<B>Monthly minute cap</B>, 'Stops calls once billed minutes this month reach the cap.', 'No cap'],
        [<B>Calling hours</B>, 'Window for outgoing calls, India time. Incoming calls are always answered.', '9:00 to 21:00'],
      ]} />

      <H id="s7" n="7">Test before go-live</H>
      <Steps items={[
        <><B>Connection</B> tab → all five progress steps should be green ("Voice server online and able to dial" included).</>,
        <><B>Incoming test:</B> call the business's number from your own phone. The agent greets as the business; have a short conversation; hang up.</>,
        <><B>Calls</B> tab: the call appears with duration, charge, Plivo seconds/cost and why it ended. The business sees it in its Call logs, with transcript.</>,
        <><B>Outgoing test</B> (if enabled): Accounts → Manage agents → <B>Call a customer</B> → your own mobile. Answer and talk.</>,
        <>Check the business wallet was charged per minute, and an "After AI call" WhatsApp journey fired if they set one up.</>,
      ]} />

      <H id="s8" n="8">Go live</H>
      <Steps items={[
        <>After the first real call works, tick <B>Reject webhooks without a valid Plivo signature</B> (Connection tab). Any fake request is then refused.</>,
        <>Tell the business their number, and that their wallet pays per minute (they can watch minutes and spend on the AI Calling page).</>,
        <>Suggest they switch on the <B>"After AI call: Booking confirmation"</B> and <B>"Callback / Team follow-up"</B> journeys (Journeys page, needs their own approved WhatsApp templates).</>,
      ]} />

      <H id="ops">Daily operations</H>
      <Table head={['Check', 'Where', 'Why']} rows={[
        ['Plivo balance', 'Connection tab', 'Calls stop when the Plivo balance is empty. Keep a buffer.'],
        ['Server online', 'Connection tab', 'If unreachable, nothing can ring. See Troubleshooting.'],
        ['Calls & costs', 'Calls tab', 'Compare what we charged vs Plivo cost. Watch for many "no answer" / errors.'],
        ['Business wallets', 'Billing page', 'Empty wallet = their callers hear "not available right now".'],
        ['Minute caps', 'Accounts tab', 'Raise caps for growing businesses.'],
        ['New numbers', 'Numbers tab', 'After renting in Plivo: Sync → Link → Assign.'],
      ]} />

      <H id="money">Pricing, billing and margins</H>
      <P>Businesses prepay their wallet. Before every call we reserve tokens for the maximum call length (default up to 10 minutes, or less if the wallet is lower); after the call we charge only the minutes used (rounded up) and release the rest. Calls that never connect are never charged.</P>
      <Table head={['Per minute', 'Approx. cost', 'Notes']} rows={[
        ['Plivo phone line', '≈ ₹0.38', 'In or out, 30-second pulse; number rent ≈ ₹200/month extra'],
        ['AI voice (Google)', '≈ ₹1.1 to 1.3', 'Depends on how much the AI speaks'],
        ['Total cost', '≈ ₹1.5 to 1.7', ''],
        ['Default price to business', '₹4.00', 'Change in Billing (all) or per account (Accounts tab)'],
      ]} />

      <H id="comp">Compliance (India / TRAI)</H>
      <Steps items={[
        <><B>Incoming calls</B> (customers calling a business number) need no DLT registration.</>,
        <><B>Outgoing calls</B> by businesses: TRAI requires promotional calls from the <B>140</B> series and service/transactional calls from <B>1600</B> (banks, finance, government) or <B>1601</B> (utilities, courier, logistics) numbers, with DLT registration and consent. Other sectors' series are still being rolled out.</>,
        <>So keep <B>Allow outgoing AI calls</B> off until Plivo confirms in writing which number series the business may use, and write that in the <B>compliance note</B>.</>,
        <>Outgoing calls only within calling hours (default 9:00 to 21:00 IST), only to people who enquired or are customers, and the AI must honour "don't call me" (it records <B>opt_out</B>; businesses should not call those people again).</>,
        <>Never use ordinary 10-digit SIM numbers or SIM boxes for automated calls: numbers get disconnected and blacklisted, with fines.</>,
      ]} />

      <H id="sec">Security</H>
      <Steps items={[
        <>Plivo token and webhook secret are stored encrypted; only the server can read them.</>,
        <>Only admins can open this page, change numbers, account rules or credentials. Businesses can only see their own agents, numbers and calls.</>,
        <><B>Rotate webhook secret</B> if you suspect the answer URL leaked (we update Plivo automatically; a call in progress may drop).</>,
        <>Turn on <B>strict signatures</B> after go-live so only genuine Plivo requests are accepted.</>,
      ]} />

      <H id="trouble">Troubleshooting</H>
      <Table head={['Symptom', 'Likely cause', 'Fix']} rows={[
        ['Caller hears "this number is not active yet"', 'Number not assigned, agent paused, or agent is outgoing-only', 'Numbers tab: assign account + agent; Manage agents: activate / allow incoming'],
        ['Caller hears "not available right now"', 'Account calling off, wallet empty, monthly cap reached, or a server error', 'Accounts tab rules; business recharges wallet; raise cap; check Calls tab'],
        ['Caller hears "all our lines are busy"', 'Max calls at once reached for that account', 'Raise "Max calls at once"'],
        ['Number rings but nothing happens / Plivo error message', 'Number not linked, app not set up, or wrong URLs in Plivo', 'Numbers: Link to app; Connection: Re-apply app settings'],
        ['"Phone calling is not connected yet"', 'Plivo credentials missing or invalid', 'Connection: Change credentials, then Check now'],
        ['"Outgoing AI calls are not enabled"', 'Account outbound switch is off', 'Accounts tab → Allow outgoing AI calls (after compliance)'],
        ['"Calls can be placed between…"', 'Outside the account’s calling hours', 'Wait, or adjust hours within TRAI limits'],
        ['Many "no_answer" in Calls tab', 'Customers not picking up', 'Call at better times; send WhatsApp first'],
        ['Last check failed (Plivo 401)', 'Token changed or account suspended', 'Paste the new token; check Plivo account status/balance'],
        ['Server unreachable', 'Voice server down', 'Ask the developer to check the rp-voice container on the VPS'],
      ]} />

      <H id="faq">FAQ</H>
      <P><B>Can two businesses share a number?</B> No. One number = one account + one agent. Rent one number per business.</P>
      <P><B>Can one business have several numbers?</B> Yes: assign each number to the same account (different agents if you like, e.g. Sales and Support).</P>
      <P><B>Does the AI speak Hindi?</B> It opens in Hinglish and mirrors the caller: Hindi, English, Hinglish, and simple Bengali.</P>
      <P><B>Where do transcripts go?</B> Into the business's Call logs (if "Save call transcripts" is on for that agent).</P>
      <P><B>What if Google AI has a hiccup mid-call?</B> The server reconnects into the same conversation automatically; the caller hears a short "sorry for the line".</P>
    </div>
  );
}
