import { useEffect } from 'react';
import { Section, GradientText, DisplayHeading, GlassCard, CTABand } from '../Shared';
import { ChatMock } from '../graphics/ChatMock';
import { JourneyCanvas } from '../graphics/JourneyCanvas';
import { MetricTicker } from '../graphics/MetricTicker';
import { SpotlightCard } from '../graphics/SpotlightCard';

interface SolutionConfig {
  slug: string;
  metaTitle: string;
  metaDesc: string;
  heroTitle: string;
  heroHighlight: string;
  heroSub: string;
  chatMessages: Array<{
    type: 'text' | 'image-template' | 'payment' | 'button-reply';
    sender: 'business' | 'customer';
    content: string;
    time?: string;
    status?: 'sent' | 'delivered' | 'read';
    buttons?: string[];
    paid?: boolean;
  }>;
  chatBusiness: string;
  painPoints: Array<{ problem: string; solution: string; metric?: string }>;
  journeySteps: Array<{ label: string; type: 'trigger' | 'wait' | 'send' | 'condition' | 'exit'; icon?: string }>;
  journeyPackTitle: string;
  journeyPresets: string[];
  featureBadge: string;
  featureTitle: string;
  featureDesc: string;
  metrics: Array<{ value: number; suffix?: string; prefix?: string; label: string; decimals?: number }>;
}

export function SolutionPage({ config }: { config: SolutionConfig }) {
  useEffect(() => {
    document.title = config.metaTitle;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', config.metaDesc);
  }, [config]);

  return (
    <>
      {/* Hero */}
      <section className="mkt-hero" style={{ minHeight: 'min(70vh, 700px)' }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '20%',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(224,70,50,0.07) 0%, transparent 60%)',
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />
        <div className="mkt-hero-grid">
          <div style={{ maxWidth: 560 }}>
            <DisplayHeading as="h1">
              {config.heroTitle}{' '}
              <GradientText>{config.heroHighlight}</GradientText>
            </DisplayHeading>
            <p className="mkt-body" style={{ marginTop: 20, fontSize: 18 }}>
              {config.heroSub}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <a href="/signup" className="mkt-btn-primary">Start free</a>
            </div>
          </div>
          <div className="hidden lg:block">
            <ChatMock messages={config.chatMessages} businessName={config.chatBusiness} />
          </div>
        </div>
      </section>

      {/* Pain → Solution rows */}
      <Section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {config.painPoints.map((pp, i) => (
            <div key={i} className="mkt-pain-row" style={{
              padding: '24px 20px', borderRadius: 20,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <div className="mkt-label" style={{ color: '#EF4444', marginBottom: 6 }}>Problem</div>
                <p className="mkt-body-sm" style={{ color: '#e2e8f0', margin: 0 }}>{pp.problem}</p>
              </div>
              <div>
                <div className="mkt-label" style={{ color: '#E04632', marginBottom: 6 }}>Solution</div>
                <p className="mkt-body-sm" style={{ color: '#e2e8f0', margin: 0 }}>{pp.solution}</p>
                {pp.metric && (
                  <span style={{
                    display: 'inline-block', marginTop: 8, padding: '4px 10px', borderRadius: 6,
                    background: 'rgba(224,70,50,0.1)', fontSize: 12, fontWeight: 600, color: '#E04632',
                  }}>{pp.metric}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Journey pack */}
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <DisplayHeading as="h2">
            Your preset pack: <GradientText>{config.journeyPackTitle}</GradientText>
          </DisplayHeading>
        </div>
        <GlassCard>
          <JourneyCanvas steps={config.journeySteps} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20, justifyContent: 'center' }}>
            {config.journeyPresets.map(j => (
              <span key={j} style={{
                padding: '6px 14px', borderRadius: 8,
                background: 'rgba(224,70,50,0.08)', border: '1px solid rgba(224,70,50,0.15)',
                fontSize: 13, color: '#E04632', fontWeight: 500,
              }}>{j}</span>
            ))}
          </div>
        </GlassCard>
      </Section>

      {/* Feature block */}
      <Section>
        <SpotlightCard>
          <div style={{ padding: '32px 24px' }}>
            <div style={{
              display: 'inline-block', padding: '6px 14px', borderRadius: 8,
              background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
              fontSize: 12, fontWeight: 600, color: '#8B5CF6', marginBottom: 16,
            }}>{config.featureBadge}</div>
            <DisplayHeading as="h3">{config.featureTitle}</DisplayHeading>
            <p className="mkt-body" style={{ marginTop: 12, maxWidth: 560 }}>{config.featureDesc}</p>
          </div>
        </SpotlightCard>
      </Section>

      {/* Metrics */}
      <Section size="sm">
        <div className="mkt-sol-metrics">
          {config.metrics.map((m, i) => (
            <MetricTicker key={i} {...m} />
          ))}
        </div>
      </Section>

      <CTABand />
    </>
  );
}
