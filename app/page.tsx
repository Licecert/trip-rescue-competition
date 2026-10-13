'use client';
import { useState, type FormEvent } from 'react';
import type { composeLiveRescueFlow } from '../src/orchestrator/live-rescue-flow.ts';
import type { RescuePersona } from '../src/domain/rescue.ts';
type Decision = ReturnType<typeof composeLiveRescueFlow>;
const personas: RescuePersona[] = ['fastest', 'cheapest', 'safest'];
const labels = { fastest: ['A', 'Arrive sooner', '最快抵达'], cheapest: ['B', 'Spend less', '最低费用'], safest: ['C', 'Keep it simple', '更低操作风险'] };
const time = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default function HomePage() {
  const mode = 'demo';
  const [date, setDate] = useState(() => new Date(Date.now() + 32 * 3600000).toISOString().slice(0, 10));
  const [origin, setOrigin] = useState('Shanghai');
  const [destination, setDestination] = useState('Hangzhou');
  const [budget, setBudget] = useState('200');
  const [deadline, setDeadline] = useState('09:00');
  const [result, setResult] = useState<Decision | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resultMode, setResultMode] = useState('demo');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try {
      const demo = mode === 'demo';
      const constraints = { origin: demo ? 'Shanghai' : origin, destination: demo ? 'Hangzhou' : destination, earliestDepartureIso: `${date}T00:00:00+08:00`, latestArrivalIso: `${date}T${deadline}:00+08:00`, ...(budget === '' ? {} : { budgetCny: Number(budget) }), language: 'English', baggage: 'standard' };
      const candidates = [
        { id: 'demo-fast', mode: 'train', title: 'Sample express · Shanghai → Hangzhou', departureIso: `${date}T06:20:00+08:00`, arrivalIso: `${date}T07:07:00+08:00`, priceCny: 160, transfers: 0, reliability: 0.7, source: 'fixture' },
        { id: 'demo-cheap', mode: 'train', title: 'Sample connection · via Jiaxing', departureIso: `${date}T06:00:00+08:00`, arrivalIso: `${date}T08:40:00+08:00`, priceCny: 60, transfers: 1, reliability: 0.5, source: 'fixture' },
        { id: 'demo-simple', mode: 'train', title: 'Sample direct · Shanghai → Hangzhou', departureIso: `${date}T06:45:00+08:00`, arrivalIso: `${date}T07:45:00+08:00`, priceCny: 100, transfers: 0, reliability: 0.9, source: 'fixture' }
      ];
      const body = { userMessage: 'Missed train recovery with explicit constraints', incidentType: 'missed_connection', constraints, inboundTraveler: true, firstTimeChina: true, ...(demo ? { candidates, providerSource: 'fixture', providerWarnings: ['DEMO: schedules, prices and reliability values are illustrative. No live availability or booking links.'], nowIso: `${date}T00:00:00+08:00` } : {}) };
      const response = await fetch(demo ? '/api/rescue' : '/api/rescue/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.issues?.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join('; ') ?? data.error ?? 'Request failed');
      setResult(data); setResultMode(mode);
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed'); }
    finally { setBusy(false); }
  }
  return <main className="shell">
    <header className="topbar"><a href="/" className="brand">✳ <strong>Trip Rescue</strong></a><span>CHINA TRAVEL · RECOVERY AGENT</span></header>
    <section className="hero"><div className="eyebrow">A MISSED TRAIN ISN’T THE END OF THE TRIP.</div><h1>Plans changed.<br /><span>Let’s find your next move.</span></h1><p>Recover from a travel disruption with three clear alternatives.<br />把突发行程，变成有依据的下一步。</p></section>
    <div className="workspace"><section className="panel"><div className="section-label">01 / YOUR SITUATION</div><h2>Build a recovery plan <small>行程救援</small></h2><form onSubmit={submit}>
      <p className="badge">GUIDED DEMO / 示例数据</p>
      <div className="mode-note">{mode === 'demo' ? 'Demo: Shanghai → Hangzhou. Prices and schedules are illustrative. 示例数据，不代表真实票价或余票。' : 'Searches FlyAI using your explicit fields. Experience-mode prices may be masked. 实时查询需服务器启用。'}</div>
      <div className="field-grid"><label>From / 出发地<input value={mode === 'demo' ? 'Shanghai' : origin} onChange={e => setOrigin(e.target.value)} readOnly={mode === 'demo'} required /></label><label>To / 目的地<input value={mode === 'demo' ? 'Hangzhou' : destination} onChange={e => setDestination(e.target.value)} readOnly={mode === 'demo'} required /></label></div>
      <div className="field-grid"><label>Travel date / 出行日期<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label><label>Arrive before / 到达期限<input type="time" value={deadline} onChange={e => setDeadline(e.target.value)} required /></label></div>
      <label>Budget per traveler / 每人预算（CNY）<input type="number" min="0" step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Optional / 可不填" /></label><p className="note">Times use UTC+8. 查询区间为所选日期，预算按单人票价。</p>
      <button className="primary" disabled={busy}>{busy ? 'Searching / 正在查询…' : mode === 'demo' ? 'Explore the demo / 体验救援方案 →' : 'Find recovery options / 查询方案 →'}</button>
    </form>{error && <p role="alert" className="error">{error}</p>}</section>
    <aside className="aside"><div className="section-label">DESIGNED FOR THE MOMENT AFTER</div><h3>You choose.<br />We make the trade-offs clear.</h3><ol><li><strong>Keep your deadline in sight</strong><span>到达时间和预算是硬约束。</span></li><li><strong>Compare three priorities</strong><span>更快、更省、操作更简单。</span></li><li><strong>Know the evidence</strong><span>展示来源、时间和不确定信息。</span></li></ol><p className="trust">Natural-language conversations run in the hosted Bailian Agent. This site hosts the decision engine and its demonstration.<br />百炼托管理解与对话；Vercel 承载救援决策。</p></aside></div>
    {result && <section className="results" aria-live="polite"><div className="section-label">02 / YOUR NEXT MOVE</div><div className="result-heading"><h2>{result.status === 'ok' ? 'Your recovery options / 救援方案' : 'No verified feasible plan / 暂无已验证可行方案'}</h2><span className="badge">{resultMode === 'demo' ? 'DEMO / 示例数据' : 'FLYAI / 实时查询'}</span></div><p className="note">{result.constraints.origin} → {result.constraints.destination} · {result.constraints.latestArrivalIso && `Arrive before ${time(result.constraints.latestArrivalIso)} (UTC+8)`} · {result.evidence.candidateCount} priced candidates</p>
      {result.status === 'no_feasible_plan' && <p className="mode-note">No priced option was verified within your constraints. Review provider warnings before changing the deadline or budget. 未获得符合约束的准确报价，请查看查询说明。</p>}
      <div className="plan-grid">{personas.map(persona => { const plan = result.plans[persona]; return <article className={`plan ${result.recommendedPersona === persona ? 'recommended' : ''}`} key={persona}><span className="plan-letter">PLAN {labels[persona][0]}</span><h3>{labels[persona][1]}</h3><p className="note">{labels[persona][2]}</p>{plan ? <><p className="plan-title">{plan.title}</p><div className="price">¥{plan.priceCny}<small> / traveler</small></div><p>{time(plan.departureIso)} →<br />{time(plan.arrivalIso)}</p><p className="note">{plan.transfers} transfers · Source: {plan.source}</p>{result.recommendedPersona === persona && <span className="badge">Suggested for your situation / 当前建议</span>}<details><summary>Why this plan? / 选择依据</summary><ul>{plan.rationale.map(r => <li key={r}>{r}</li>)}{plan.warnings?.map(w => <li key={w}>{w}</li>)}</ul></details>{plan.bookingUrl && <a className="booking" href={plan.bookingUrl} target="_blank" rel="noopener noreferrer">Check on provider / 前往核实 ↗</a>}</> : <p>No verified option / 无可行选项</p>}</article>; })}</div>
      <details className="evidence" open><summary>Source & uncertainty / 数据来源与限制</summary><p>Source: {result.evidence.source} · Retrieved: {result.evidence.generatedAt ? time(result.evidence.generatedAt) : 'Illustrative fixture'} · Generated: {time(result.generatedAt)}</p><ul>{result.evidence.warnings.map(w => <li key={w}>{w}</li>)}</ul></details><p className="trust">{result.trustNotice}</p>
    </section>}<footer>Trip Rescue · 2026 Fliggy AI Travel Innovation Competition <span>When the trip breaks, rebuild the plan.</span></footer>
  </main>;
}
