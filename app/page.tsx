'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [agents, setAgents] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [arbs, setArbs] = useState<any[]>([]);
  const [temporal, setTemporal] = useState<any>({ signals: [], spotPrices: null });
  const [statarb, setStatarb] = useState<any>({ signals: [] });
  const [risk, setRisk] = useState<any>({ sizedPositions: [] });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const load = async () => {
    try {
      const [statusRes, scannerRes, arbRes, temporalRes, statRes, riskRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/scanner'),
        fetch('/api/arb'),
        fetch('/api/temporal'),
        fetch('/api/statarb'),
        fetch('/api/risk'),
      ]);
      const status = await statusRes.json();
      const scanner = await scannerRes.json();
      const arb = await arbRes.json();
      const temp = await temporalRes.json();
      const stat = await statRes.json();
      const riskData = await riskRes.json();
      setAgents(status.agents || []);
      setMarkets(scanner.markets || []);
      setArbs(arb.opportunities || []);
      setTemporal(temp);
      setStatarb(stat);
      setRisk(riskData);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>WICAI Polymarket Agents</h1>
        <p>Multi-agent system targeting crypto prediction markets on Polymarket</p>
        <p style={{marginTop: '0.5rem', opacity: 0.7}}>
          Domain: wicai.net • Paper mode • Last update: {lastUpdate || '—'}
        </p>
      </div>

      <div className="warning">
        <strong>Live trading status:</strong> Paper / signal mode only. Real execution requires your Polygon wallet private key, USDC balance, and API credentials. Never share keys. Trading involves risk of total capital loss.
      </div>

      <h2 style={{marginBottom: '1rem'}}>Active Agents</h2>
      {loading ? <p>Loading agents…</p> : (
        <div className="agents-grid">
          {agents.map((a) => (
            <div key={a.name} className="agent-card">
              <h3>{a.name}</h3>
              <p>{a.role}</p>
              <p className={a.status.includes('Idle') ? 'status-idle' : 'status-online'} style={{marginTop: '0.75rem'}}>
                ● {a.status}
              </p>
              {a.lastAction && <p style={{marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8}}>{a.lastAction}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="markets">
        <h2>Risk Manager — Fractional Kelly Sizing</h2>
        <p style={{margin: '1rem 0'}}>
          Paper bankroll ${risk.bankroll?.toLocaleString() || '10,000'} • 1/4 Kelly • Max 2% per trade • Max 15% total exposure
        </p>
        {risk.totalExposurePct && (
          <p style={{marginBottom: '1rem', color: risk.withinLimits ? '#22c55e' : '#ef4444'}}>
            Total recommended exposure: ${risk.totalRecommendedExposure?.toLocaleString()} ({risk.totalExposurePct}%)
            {risk.withinLimits ? ' — within limits' : ' — exceeds limits'}
          </p>
        )}
        {(risk.sizedPositions || []).length === 0 ? (
          <p>No sized positions right now.</p>
        ) : (
          <div style={{display: 'grid', gap: '0.75rem'}}>
            {(risk.sizedPositions || []).map((p: any, i: number) => (
              <div key={i} style={{background: '#1a1a24', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b'}}>
                <strong>{p.question}</strong>
                <div style={{fontSize: '0.9rem', marginTop: '0.4rem'}}>
                  Source: {p.source} • Edge ~{p.edgePct}% • Size: <strong>${p.recommendedSize}</strong>
                </div>
                <div style={{fontSize: '0.85rem', opacity: 0.75, marginTop: '0.25rem'}}>{p.rationale}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="markets">
        <h2>Forecasting Ensemble — Statistical Arbitrage</h2>
        <p style={{margin: '1rem 0'}}>Momentum-adjusted fair value model. Flags deviations &gt; 8%.</p>
        {(statarb.signals || []).length === 0 ? (
          <p>No large statistical deviations right now.</p>
        ) : (
          <div style={{display: 'grid', gap: '0.75rem'}}>
            {(statarb.signals || []).map((s: any, i: number) => (
              <div key={i} style={{background: '#1a1a24', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #a855f7'}}>
                <strong>{s.question}</strong>
                <div style={{fontSize: '0.9rem', marginTop: '0.4rem'}}>
                  Market Up: {s.marketUp} • Fair: {s.fairValue} • Deviation: {s.deviation}%
                </div>
                <div style={{fontSize: '0.85rem', opacity: 0.75, marginTop: '0.25rem'}}>{s.signal}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="markets">
        <h2>Strategy Specialists — Temporal Arbitrage</h2>
        {(temporal.signals || []).length === 0 ? (
          <p>No strong temporal lag signals right now.</p>
        ) : (
          <div style={{display: 'grid', gap: '0.75rem'}}>
            {(temporal.signals || []).map((s: any, i: number) => (
              <div key={i} style={{background: '#1a1a24', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #60a5fa'}}>
                <strong>{s.question}</strong>
                <div style={{fontSize: '0.9rem', marginTop: '0.4rem'}}>
                  {s.asset} • Polymarket Up: {s.polymarketUp} • {s.edge}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="markets">
        <h2>Strategy Specialists — Complete-Set Arbitrage</h2>
        {arbs.length === 0 ? (
          <p>No complete-set opportunities above threshold right now.</p>
        ) : (
          <div style={{display: 'grid', gap: '0.75rem'}}>
            {arbs.map((o) => (
              <div key={o.id} style={{background: '#1a1a24', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #22c55e'}}>
                <strong>{o.question}</strong>
                <div style={{fontSize: '0.9rem', marginTop: '0.4rem'}}>
                  YES {o.yesPrice} + NO {o.noPrice} = {o.sum} • Edge ~{o.edgePct}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{marginTop: '2rem', textAlign: 'center', opacity: 0.6}}>
        <p>Repository: <a href="https://github.com/dwcwicofficial/wicai-polymarket-agents" target="_blank">github.com/dwcwicofficial/wicai-polymarket-agents</a></p>
        <p>All signals and sizes are paper mode only</p>
      </div>
    </div>
  );
}
