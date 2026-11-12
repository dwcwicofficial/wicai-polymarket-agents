'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [agents, setAgents] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [arbs, setArbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const load = async () => {
    try {
      const [statusRes, scannerRes, arbRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/scanner'),
        fetch('/api/arb'),
      ]);
      const status = await statusRes.json();
      const scanner = await scannerRes.json();
      const arb = await arbRes.json();
      setAgents(status.agents || []);
      setMarkets(scanner.markets || []);
      setArbs(arb.opportunities || []);
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
        <h2>Strategy Specialists — Complete-Set Arbitrage</h2>
        <p style={{margin: '1rem 0'}}>
          Detects markets where YES + NO &lt; ~$0.985 (paper signals only). Real fills require CLOB best-ask confirmation.
        </p>
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
                <div style={{fontSize: '0.85rem', opacity: 0.75, marginTop: '0.25rem'}}>{o.action}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="markets">
        <h2>Scanner Agent — Live Crypto Markets</h2>
        <p style={{margin: '1rem 0'}}>Real-time data from Polymarket Gamma API (refreshes every 30s)</p>
        {markets.length === 0 ? (
          <p>No crypto-relevant markets found right now.</p>
        ) : (
          <div style={{display: 'grid', gap: '0.75rem'}}>
            {markets.map((m) => (
              <div key={m.id} style={{background: '#1a1a24', padding: '1rem', borderRadius: '8px'}}>
                <strong>{m.question}</strong>
                <div style={{fontSize: '0.85rem', opacity: 0.7, marginTop: '0.25rem'}}>
                  Vol: {m.volume ? Number(m.volume).toLocaleString() : '—'} • Liq: {m.liquidity ? Number(m.liquidity).toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{marginTop: '2rem', textAlign: 'center', opacity: 0.6}}>
        <p>Repository: <a href="https://github.com/dwcwicofficial/wicai-polymarket-agents" target="_blank">github.com/dwcwicofficial/wicai-polymarket-agents</a></p>
        <p>Next: Connect wallet securely → enable live mode</p>
      </div>
    </div>
  );
}
