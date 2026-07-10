import { useRef, useState, useEffect } from 'react';

interface ChatMessage {
  type: 'text' | 'image-template' | 'payment' | 'button-reply';
  sender: 'business' | 'customer';
  content: string;
  time?: string;
  status?: 'sent' | 'delivered' | 'read';
  buttons?: string[];
  paid?: boolean;
}

interface ChatMockProps {
  messages: ChatMessage[];
  businessName?: string;
  animate?: boolean;
  className?: string;
  compact?: boolean;
}

export function ChatMock({ messages, businessName = 'ReachPeak Store', animate = true, className = '', compact = false }: ChatMockProps) {
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : messages.length);
  const [paidFlipped, setPaidFlipped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!animate) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasStarted.current) {
        hasStarted.current = true;
        let i = 0;
        const interval = setInterval(() => {
          i++;
          setVisibleCount(i);
          if (i >= messages.length) {
            clearInterval(interval);
            setTimeout(() => setPaidFlipped(true), 600);
          }
        }, 450);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate, messages.length]);

  const sz = compact ? 0.75 : 1;

  return (
    <div ref={containerRef} className={className} style={{
      width: '100%',
      maxWidth: compact ? 260 : 340,
      margin: '0 auto',
      borderRadius: 20 * sz,
      background: '#0B141A',
      border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      transform: `scale(${sz === 1 ? 1 : sz})`,
      transformOrigin: 'top left',
    }}>
      {/* Header */}
      <div style={{
        padding: `${12 * sz}px ${16 * sz}px`,
        background: '#1F2C34',
        display: 'flex', alignItems: 'center', gap: 10 * sz,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{
          width: 36 * sz, height: 36 * sz, borderRadius: '50%',
          background: 'linear-gradient(135deg, #E04632, #C83A28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14 * sz, fontWeight: 700, color: 'white',
        }}>{businessName[0]}</div>
        <div>
          <div style={{ fontSize: 14 * sz, fontWeight: 600, color: '#e2e8f0' }}>{businessName}</div>
          <div style={{ fontSize: 11 * sz, color: '#E04632', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E04632', display: 'inline-block' }} />
            online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ padding: `${12 * sz}px ${10 * sz}px`, minHeight: compact ? 120 : 200, display: 'flex', flexDirection: 'column', gap: 6 * sz }}>
        {messages.slice(0, visibleCount).map((msg, i) => (
          <MessageBubble key={i} msg={msg} sz={sz} paidFlipped={paidFlipped} />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ msg, sz, paidFlipped }: { msg: ChatMessage; sz: number; paidFlipped: boolean }) {
  const isBiz = msg.sender === 'business';
  const bgColor = isBiz ? '#005C4B' : '#1F2C34';

  return (
    <div style={{
      display: 'flex', justifyContent: isBiz ? 'flex-end' : 'flex-start',
      opacity: 1,
      animation: 'chatFadeIn 0.3s ease-out',
    }}>
      <div style={{
        maxWidth: '82%',
        background: bgColor,
        borderRadius: `${14 * sz}px ${14 * sz}px ${isBiz ? '4' : '14'}px ${isBiz ? '14' : '4'}px`,
        padding: `${8 * sz}px ${10 * sz}px`,
      }}>
        {msg.type === 'image-template' && (
          <div style={{
            width: '100%', height: 80 * sz, borderRadius: 8 * sz, marginBottom: 6 * sz,
            background: 'linear-gradient(135deg, #1e3a5f, #0d2137)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24 * sz,
          }}>🛍️</div>
        )}

        <div style={{ fontSize: 13 * sz, color: '#e2e8f0', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg.content}
        </div>

        {msg.type === 'payment' && (
          <div style={{
            marginTop: 6 * sz, padding: `${6 * sz}px ${10 * sz}px`,
            borderRadius: 8 * sz,
            background: (msg.paid && paidFlipped) ? 'rgba(224,70,50,0.15)' : 'rgba(255,255,255,0.08)',
            fontSize: 12 * sz, fontWeight: 600,
            color: (msg.paid && paidFlipped) ? '#E04632' : '#e2e8f0',
            transition: 'all 0.5s ease',
            textAlign: 'center',
          }}>
            {(msg.paid && paidFlipped) ? '✅ Paid' : '💳 Pay now'}
          </div>
        )}

        {msg.buttons && msg.buttons.length > 0 && (
          <div style={{ display: 'flex', gap: 4 * sz, marginTop: 6 * sz, flexWrap: 'wrap' }}>
            {msg.buttons.map((btn, j) => (
              <span key={j} style={{
                padding: `${4 * sz}px ${10 * sz}px`, borderRadius: 6 * sz,
                background: 'rgba(255,255,255,0.08)', fontSize: 11 * sz,
                color: '#93c5fd', fontWeight: 500,
              }}>{btn}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 * sz }}>
          <span style={{ fontSize: 10 * sz, color: 'rgba(255,255,255,0.35)' }}>{msg.time || '2:34 PM'}</span>
          {isBiz && msg.status && (
            <span style={{ fontSize: 10 * sz, color: msg.status === 'read' ? '#53BDEB' : 'rgba(255,255,255,0.35)' }}>
              {msg.status === 'sent' ? '✓' : '✓✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
