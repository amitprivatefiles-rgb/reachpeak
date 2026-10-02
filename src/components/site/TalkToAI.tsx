import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { X, Mic, PhoneOff, Check } from 'lucide-react';

// Live voice demo: browser mic ↔ voice.reachpeak.in (relay) ↔ Gemini Live. The Google key never reaches the browser.
const VOICE_WS = (import.meta.env.VITE_VOICE_WS as string | undefined) || 'wss://voice.reachpeak.in/ws';

export const TALK_AGENTS: Record<string, { label: string; who: string }> = {
  clinic: { label: 'Clinic', who: 'Riya · Aarogya Skin Clinic' },
  realestate: { label: 'Real estate', who: 'Arjun · Green Valley Homes' },
  coaching: { label: 'Coaching', who: 'Aditi · Vidya Academy' },
  retail: { label: 'Online store', who: 'Riya · Urban Threads' },
};
export const agentForIndustry = (slug?: string) => ({ clinics: 'clinic', 'real-estate': 'realestate', education: 'coaching', ecommerce: 'retail' } as Record<string, string>)[slug || ''] || 'clinic';

const TalkCtx = createContext<{ open: (agent?: string) => void }>({ open: () => {} });
export const useTalk = () => useContext(TalkCtx);

export function TalkProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<string | null>(null);
  const value = useMemo(() => ({ open: (a?: string) => setAgent(a && TALK_AGENTS[a] ? a : 'clinic') }), []);
  return <TalkCtx.Provider value={value}>{children}{agent && <TalkModal initial={agent} onClose={() => setAgent(null)} />}</TalkCtx.Provider>;
}

export function TalkButton({ agent, className = 'rp-btn primary', label = 'Talk to our AI now' }: { agent?: string; className?: string; label?: string }) {
  const { open } = useTalk();
  return <button type="button" className={className} onClick={() => open(agent)}><Mic size={17} />{label}</button>;
}

const WORKLET = `class Cap extends AudioWorkletProcessor{constructor(){super();this.buf=[];this.ratio=sampleRate/16000;this.pos=0}
process(inp){const ch=inp[0]&&inp[0][0];if(!ch)return true;
for(;this.pos<ch.length;this.pos+=this.ratio){const a=Math.floor(this.pos),b=Math.min(ch.length-1,a+1);this.buf.push(Math.max(-1,Math.min(1,(ch[a]+ch[b])/2)))}
this.pos-=ch.length;if(this.buf.length>=1600){let lvl=0;const o=new Int16Array(this.buf.length);for(let i=0;i<this.buf.length;i++){const v=this.buf[i];o[i]=v*32767;const m=v<0?-v:v;if(m>lvl)lvl=m}this.port.postMessage({pcm:o.buffer,lvl},[o.buffer]);this.buf=[]}return true}}
registerProcessor('rp-cap',Cap);`;

type Line = { role: 'agent' | 'user'; text: string };
type Phase = 'idle' | 'connecting' | 'live' | 'ended';

function TalkModal({ initial, onClose }: { initial: string; onClose: () => void }) {
  const [agent, setAgent] = useState(initial);
  const [phase, setPhase] = useState<Phase>('idle');
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState<{ text: string; ok?: boolean }[]>([]);
  const [level, setLevel] = useState(0);
  const [secs, setSecs] = useState(0);
  const [name, setName] = useState(() => { try { return localStorage.getItem('rp_talk_name') || ''; } catch { return ''; } });
  const nameRef = useRef<HTMLInputElement>(null);
  const r = useRef<{ ws?: WebSocket; ctxIn?: AudioContext; ctxOut?: AudioContext; stream?: MediaStream; head: number; srcs: AudioBufferSourceNode[]; timer?: number; done?: boolean; live?: boolean }>({ head: 0, srcs: [] });
  const linesRef = useRef<HTMLDivElement>(null);
  const breakNext = useRef(false);

  const note = (text: string, ok?: boolean) => setNotes((n) => (n.some((x) => x.text === text) ? n : [...n, { text, ok }]));
  const addLine = (role: Line['role'], text: string) => {
    const brk = breakNext.current; breakNext.current = false;
    setLines((ls) => {
      const last = ls[ls.length - 1];
      return last && last.role === role && !brk ? [...ls.slice(0, -1), { role, text: last.text + text }] : [...ls, { role, text: text.trimStart() }];
    });
  };
  useEffect(() => { linesRef.current?.scrollTo({ top: 1e9 }); }, [lines]);

  const stop = useCallback((graceful?: unknown) => {
    const s = r.current;
    if (!s.ws && !s.ctxIn && !s.stream) { s.done = true; setPhase((p) => (p === 'idle' ? p : 'ended')); return; } // already stopped: keep the goodbye playing
    s.done = true; s.live = false;
    const ws = s.ws; s.ws = undefined;
    try { ws?.close(); } catch { /* ignore */ }
    s.stream?.getTracks().forEach((t) => t.stop()); s.stream = undefined;
    const inp = s.ctxIn; s.ctxIn = undefined; inp?.close().catch(() => { /* ignore */ });
    const out = s.ctxOut; s.ctxOut = undefined;
    if (graceful !== true) { s.srcs.forEach((x) => { try { x.stop(); } catch { /* ignore */ } }); s.srcs = []; }
    const left = out && graceful === true ? Math.max(0, s.head - out.currentTime) * 1000 : 0; // let the goodbye finish
    setTimeout(() => { out?.close().catch(() => { /* ignore */ }); }, Math.min(8000, left + 400));
    if (s.timer) window.clearInterval(s.timer);
    setLevel(0);
    setPhase((p) => (p === 'idle' ? p : 'ended'));
  }, []);
  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    const wake = () => { const s = r.current; if (document.visibilityState === 'visible') { s.ctxIn?.resume().catch(() => {}); s.ctxOut?.resume().catch(() => {}); } };
    document.addEventListener('visibilitychange', wake);
    return () => document.removeEventListener('visibilitychange', wake);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { stop(); onClose(); } };
    window.addEventListener('keydown', onKey);
    const prev = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = prev; };
  }, [onClose, stop]);

  const play = (buf: ArrayBuffer) => {
    const s = r.current; const ctx = s.ctxOut; if (!ctx) return;
    const i16 = new Int16Array(buf); const f = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f[i] = i16[i] / 32768;
    const ab = ctx.createBuffer(1, f.length, 24000); ab.copyToChannel(f, 0);
    const src = ctx.createBufferSource(); src.buffer = ab; src.connect(ctx.destination);
    s.head = Math.max(s.head, ctx.currentTime + 0.03); src.start(s.head); s.head += ab.duration;
    s.srcs.push(src); src.onended = () => { s.srcs = s.srcs.filter((x) => x !== src); };
  };
  const playing = () => { const s = r.current; return !!s.ctxOut && s.head > s.ctxOut.currentTime + 0.05; };
  const flush = () => { const s = r.current; s.srcs.forEach((x) => { try { x.stop(); } catch { /* ignore */ } }); s.srcs = []; s.head = 0; };

  const start = async () => {
    const clean = name.trim();
    if (!clean) { note('Please enter your name so the agent can greet you.'); nameRef.current?.focus(); return; }
    try { localStorage.setItem('rp_talk_name', clean); } catch { /* ignore */ }
    setLines([]); setNotes([]); setSecs(0); setPhase('connecting');
    const s = r.current; s.done = false; s.live = false; s.head = 0; s.srcs = [];
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
      setPhase('idle'); note('This browser can’t run the voice demo. Please open the site in a recent Chrome, Safari or Edge.'); return;
    }
    try {
      s.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch (err) {
      const n = (err as DOMException)?.name;
      setPhase('idle');
      note(n === 'NotFoundError' || n === 'OverconstrainedError' ? 'No microphone found. Please connect a microphone or headset and try again.'
        : n === 'NotReadableError' ? 'Your microphone is being used by another app. Close it and try again.'
        : 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.');
      return;
    }
    if (s.done) { s.stream.getTracks().forEach((t) => t.stop()); s.stream = undefined; return; } // closed while the mic prompt was open
    try {
      s.ctxIn = new AudioContext(); s.ctxOut = new AudioContext({ sampleRate: 24000 });
      await Promise.all([s.ctxIn.resume(), s.ctxOut.resume()]); // unlock audio on iPhone / Safari (we are inside the tap)
      await s.ctxIn.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })));
    } catch {
      s.stream.getTracks().forEach((t) => t.stop()); setPhase('idle'); note('Could not start audio in this browser. Please try Chrome or Safari.'); return;
    }
    if (s.done || !s.ctxIn) return;
    const node = new AudioWorkletNode(s.ctxIn, 'rp-cap');
    s.ctxIn.createMediaStreamSource(s.stream).connect(node);
    const ws = new WebSocket(`${VOICE_WS}?agent=${agent}&name=${encodeURIComponent(name.trim().slice(0, 30))}`); ws.binaryType = 'arraybuffer'; s.ws = ws;
    node.port.onmessage = (e) => {
      if (typeof e.data.lvl === 'number') setLevel(e.data.lvl);
      if (!e.data.pcm || ws.readyState !== 1) return;
      ws.send(playing() && e.data.lvl < 0.06 ? new ArrayBuffer(e.data.pcm.byteLength) : e.data.pcm);
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') { play(e.data); return; }
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'ready') { s.live = true; setPhase('live'); const t0 = Date.now(); s.timer = window.setInterval(() => setSecs(Math.round((Date.now() - t0) / 1000)), 500); }
      if (m.type === 'agent') addLine('agent', m.text);
      if (m.type === 'user') addLine('user', m.text);
      if (m.type === 'interrupted') { flush(); breakNext.current = true; }
      if (m.type === 'turn') breakNext.current = true;
      if (m.type === 'outcome') note(m.summary || m.outcome, true);
      if (m.type === 'refused' || m.type === 'info') note(m.text);
      if (m.type === 'error') note('Something went wrong. Please try again.');
      if (m.type === 'refused' || m.type === 'closed' || m.type === 'error') stop(true);
      if (m.type === 'ended') { s.done = true; stop(true); }
    };
    ws.onerror = () => { if (!s.done) note(s.live ? 'The call dropped. Please check your internet and try again.' : 'Could not reach the demo line. Please try again in a moment.'); stop(); };
    ws.onclose = () => { if (!s.done) note(s.live ? 'The call dropped. Please check your internet and try again.' : 'Could not reach the demo line. Please try again in a moment.'); stop(); };
    // microphone unplugged / taken by another app mid-call
    s.stream.getAudioTracks()[0]?.addEventListener('ended', () => { if (!s.done) { note('Your microphone disconnected, so the call ended.'); stop(); } });
  };

  const who = TALK_AGENTS[agent];
  return (
    <div className="rp-modal-bg" onClick={() => { stop(); onClose(); }} role="dialog" aria-modal="true" aria-label="Talk to our AI">
      <div className="rp-modal rp-talk" onClick={(e) => e.stopPropagation()}>
        <button className="rp-x" onClick={() => { stop(); onClose(); }} aria-label="Close"><X size={18} /></button>
        <span className="rp-live"><i />Live AI demo</span>
        <h2>Talk to our AI agent.</h2>
        <p className="rp-body">Pick a business and press start. Talk like a customer, in Hindi, English or Hinglish. Interrupt any time.</p>
        <div className="rp-talk-agents" role="radiogroup" aria-label="Example business">
          {Object.entries(TALK_AGENTS).map(([k, v]) => (
            <button key={k} type="button" role="radio" aria-checked={agent === k} className={agent === k ? 'on' : ''} disabled={phase === 'connecting' || phase === 'live'} onClick={() => setAgent(k)}>{v.label}</button>
          ))}
        </div>
        <div className="rp-field" style={{ marginBottom: 14 }}>
          <label htmlFor="talk-name">Your first name</label>
          <input id="talk-name" ref={nameRef} value={name} maxLength={30} autoComplete="given-name" placeholder="e.g. Amit" disabled={phase === 'connecting' || phase === 'live'}
            onChange={(e) => { setName(e.target.value); setNotes((n) => n.filter((x) => !x.text.startsWith('Please enter your name'))); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && phase !== 'live' && phase !== 'connecting') start(); }} />
        </div>
        <div className="rp-talk-call">
          <div className="rp-call-top">
            <div className="rp-ava">AI</div>
            <div><b>{phase === 'live' ? 'On call' : phase === 'connecting' ? 'Connecting…' : phase === 'ended' ? 'Call ended' : 'Ready'}</b><small>{who.who}</small></div>
            <span className="rp-timer" style={{ color: phase === 'live' ? '#6EE7A0' : '#8C8E96' }}>{phase === 'live' ? `● ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : phase.toUpperCase()}</span>
          </div>
          <div className="rp-talk-meter"><i style={{ width: `${Math.min(100, level * 140)}%` }} /></div>
          <div className="rp-talk-lines" ref={linesRef}>
            {lines.length === 0 && <p className="rp-talk-empty">{phase === 'live' ? 'Listening… say hello.' : `The agent will call you${name.trim() ? ', ' + name.trim().split(' ')[0] : ''}, and speak first like a real call.`}</p>}
            {lines.map((l, i) => <div key={i} className={`rp-line ${l.role === 'agent' ? 'ai' : ''}`}><span>{l.role === 'agent' ? 'AI agent' : 'You'}</span><div>{l.text}</div></div>)}
          </div>
          {notes.length > 0 && <div className="rp-outcome" style={{ visibility: 'visible' }}>{notes.map((n) => <span key={n.text} className="rp-chip" style={n.ok ? undefined : { background: 'rgba(244,244,241,.08)', color: '#D5D6DA' }}>{n.ok && <Check size={13} />}{n.text}</span>)}</div>}
        </div>
        <div className="rp-btns" style={{ marginTop: 18 }}>
          {phase === 'live' || phase === 'connecting'
            ? <button type="button" className="rp-btn ink" onClick={stop}><PhoneOff size={17} />End call</button>
            : <button type="button" className="rp-btn primary" onClick={start}><Mic size={17} />{phase === 'ended' ? 'Call again' : 'Start call'}</button>}
        </div>
        <p className="rp-note">Use headphones for the best experience. Example businesses are illustrative. Your voice is processed live to run the demo and isn’t stored. Demo calls end after 3 minutes.</p>
      </div>
    </div>
  );
}
