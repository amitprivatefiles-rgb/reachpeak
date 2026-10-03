import { useCallback, useEffect, useRef, useState } from 'react';

// Browser ↔ voice server (voice.reachpeak.in) live call: mic capture at 16 kHz, agent audio playback at 24 kHz,
// barge-in, echo gate, graceful goodbye playback. Same hardened logic as the website "Talk to AI" widget.
export const VOICE_WS = (import.meta.env.VITE_VOICE_WS as string | undefined) || 'wss://voice.reachpeak.in/ws';

const WORKLET = `class Cap extends AudioWorkletProcessor{constructor(){super();this.buf=[];this.ratio=sampleRate/16000;this.pos=0}
process(inp){const ch=inp[0]&&inp[0][0];if(!ch)return true;
for(;this.pos<ch.length;this.pos+=this.ratio){const a=Math.floor(this.pos),b=Math.min(ch.length-1,a+1);this.buf.push(Math.max(-1,Math.min(1,(ch[a]+ch[b])/2)))}
this.pos-=ch.length;if(this.buf.length>=1600){let lvl=0;const o=new Int16Array(this.buf.length);for(let i=0;i<this.buf.length;i++){const v=this.buf[i];o[i]=v*32767;const m=v<0?-v:v;if(m>lvl)lvl=m}this.port.postMessage({pcm:o.buffer,lvl},[o.buffer]);this.buf=[]}return true}}
registerProcessor('rp-cap',Cap);`;

export type CallLine = { role: 'agent' | 'user'; text: string };
export type CallPhase = 'idle' | 'connecting' | 'live' | 'ended';
export type CallNote = { text: string; ok?: boolean };
type Session = { ws?: WebSocket; ctxIn?: AudioContext; ctxOut?: AudioContext; stream?: MediaStream; head: number; srcs: AudioBufferSourceNode[]; timer?: number; done?: boolean; live?: boolean };

export function useVoiceCall() {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [lines, setLines] = useState<CallLine[]>([]);
  const [notes, setNotes] = useState<CallNote[]>([]);
  const [level, setLevel] = useState(0);
  const [secs, setSecs] = useState(0);
  const r = useRef<Session>({ head: 0, srcs: [] });
  const breakNext = useRef(false);

  const note = useCallback((text: string, ok?: boolean) => setNotes((n) => (n.some((x) => x.text === text) ? n : [...n, { text, ok }])), []);
  const addLine = (role: CallLine['role'], text: string) => {
    const brk = breakNext.current; breakNext.current = false;
    setLines((ls) => {
      const last = ls[ls.length - 1];
      return last && last.role === role && !brk ? [...ls.slice(0, -1), { role, text: last.text + text }] : [...ls, { role, text: text.trimStart() }];
    });
  };

  const stop = useCallback((graceful?: unknown) => {
    const s = r.current;
    if (!s.ws && !s.ctxIn && !s.stream) { s.done = true; setPhase((p) => (p === 'idle' ? p : 'ended')); return; }
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

  // url: full WebSocket URL; onOpen: e.g. send an auth message before any audio flows.
  const start = useCallback(async (url: string, onOpen?: (ws: WebSocket) => void) => {
    setLines([]); setNotes([]); setSecs(0); setPhase('connecting');
    const s = r.current; s.done = false; s.live = false; s.head = 0; s.srcs = [];
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
      setPhase('idle'); note('This browser can’t run voice calls. Please use a recent Chrome, Safari or Edge.'); return;
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
    if (s.done) { s.stream.getTracks().forEach((t) => t.stop()); s.stream = undefined; return; }
    try {
      s.ctxIn = new AudioContext(); s.ctxOut = new AudioContext({ sampleRate: 24000 });
      await Promise.all([s.ctxIn.resume(), s.ctxOut.resume()]);
      await s.ctxIn.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })));
    } catch {
      s.stream.getTracks().forEach((t) => t.stop()); setPhase('idle'); note('Could not start audio in this browser. Please try Chrome or Safari.'); return;
    }
    if (s.done || !s.ctxIn) return;
    const node = new AudioWorkletNode(s.ctxIn, 'rp-cap');
    s.ctxIn.createMediaStreamSource(s.stream).connect(node);
    const ws = new WebSocket(url); ws.binaryType = 'arraybuffer'; s.ws = ws;
    ws.onopen = () => { try { onOpen?.(ws); } catch { /* ignore */ } };
    node.port.onmessage = (e) => {
      if (typeof e.data.lvl === 'number') setLevel(e.data.lvl);
      if (!e.data.pcm || ws.readyState !== 1 || !s.live) return; // no audio until the agent is connected
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
    const dropped = () => { if (!s.done) note(s.live ? 'The call dropped. Please check your internet and try again.' : 'Could not reach the voice line. Please try again in a moment.'); stop(); };
    ws.onerror = dropped;
    ws.onclose = dropped;
    s.stream.getAudioTracks()[0]?.addEventListener('ended', () => { if (!s.done) { note('Your microphone disconnected, so the call ended.'); stop(); } });
  }, [note, stop]);

  return { phase, lines, notes, level, secs, start, stop, note };
}
