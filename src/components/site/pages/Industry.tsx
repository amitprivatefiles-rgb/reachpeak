import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CallCard, Ch, CtaBand, DemoButton, Head, Live } from '../ui';
import { INDUSTRIES } from '../data';

export default function Industry({ slug: fixed }: { slug?: string }) {
  const params = useParams();
  const slug = fixed || params.slug;
  const ind = INDUSTRIES.find((i) => i.slug === slug);
  if (!ind) return <Navigate to="/use-cases" replace />;
  const others = INDUSTRIES.filter((i) => i.slug !== ind.slug);
  return (
    <>
      <section className="rp-hero"><div className="rp-wrap rp-split">
        <div>
          <span className="rp-eyebrow">{ind.name}</span>
          <h1 className="rp-h1" style={{ fontSize: 'clamp(40px,6vw,72px)' }}>{ind.hero} <em>{ind.heroEm}</em></h1>
          <p className="rp-lead">{ind.sub}</p>
          <div className="rp-btns"><DemoButton industry={ind.name} /><Link to="/signup" className="rp-btn ghost">Get started</Link></div>
          <div style={{ marginTop: 28 }}><Live>AI calling + WhatsApp · live</Live></div>
        </div>
        <CallCard only={ind.slug} />
      </div></section>

      <section className="rp-sec rp-dark tight"><div className="rp-wrap rp-split">
        <div><span className="rp-eyebrow">The problem</span><p className="rp-quote" style={{ marginTop: 18 }}>{ind.pain}</p></div>
        <div><span className="rp-eyebrow">What to measure</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>{ind.track.map((t) => <span key={t} className="rp-tag n" style={{ fontSize: 12, padding: '10px 14px' }}>{t}</span>)}</div>
          <p className="rp-body" style={{ marginTop: 16 }}>ReachPeak reports these for you, call by call and message by message.</p></div>
      </div></section>

      <section className="rp-sec"><div className="rp-wrap">
        <Head eyebrow="Ready-made journeys" title={<>How {ind.name.toLowerCase()} teams <em>use ReachPeak.</em></>} lead="Every journey is editable: your script, your timing, your rules." />
        <div className="rp-grid rp-g4">
          {ind.journeys.map((j) => (
            <div key={j.title} className="rp-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="rp-eyebrow" style={{ color: 'var(--faint)' }}>{j.k}</span>
              <h3 className="rp-h3">{j.title}</h3>
              <p className="rp-body" style={{ margin: 0 }}>{j.text}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 10 }}><Ch ch={j.ch} /></div>
            </div>
          ))}
        </div>
      </div></section>

      <section className="rp-sec" style={{ background: '#F2F1EC' }}><div className="rp-wrap">
        <Head eyebrow="Other industries" title={<>Same platform, <em>every kind of business.</em></>} />
        <div className="rp-grid rp-g3">
          {others.map((i) => <Link key={i.slug} to={`/solutions/${i.slug}`} className="rp-card hover"><div className="rp-ind"><h3>{i.name}</h3><p>{i.short}</p><span className="rp-link">See journeys <ArrowRight size={15} /></span></div></Link>)}
        </div>
      </div></section>
      <CtaBand title={<>Hear what it sounds like <em>for {ind.name.toLowerCase()}.</em></>} />
    </>
  );
}
