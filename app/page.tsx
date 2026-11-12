export default function Home() {
  const agents = [
    { name: 'Scanner Agent', role: 'Market discovery & data ingestion (Gamma + CLOB + spot prices)', status: 'Online' },
    { name: 'Forecasting Ensemble', role: 'Statistical + LLM signals for Up/Down and event markets', status: 'Online' },
    { name: 'Strategy Specialists', role: 'Arb, Market Making, Late-window Sniper, Selective Copy', status: 'Online' },
    { name: 'Risk Manager', role: 'Fractional Kelly sizing, exposure limits, drawdown controls', status: 'Online' },
    { name: 'Execution Agent', role: 'CLOB order placement & WebSocket monitoring', status: 'Idle (keys required)' },
    { name: 'Monitor & Learning', role: 'PnL tracking, edge decay analysis, adaptation', status: 'Online' },
  ];

  return (
    <div className="container">
      <div className="header">
        <h1>WICAI Polymarket Agents</h1>
        <p>Multi-agent system targeting crypto prediction markets on Polymarket</p>
        <p style={{marginTop: '0.5rem', opacity: 0.7}}>Domain: wicai.net • Built for systematic edge</p>
      </div>

      <div className="warning">
        <strong>Live trading status:</strong> Paper / signal mode only. Real execution requires your Polygon wallet private key, USDC balance, and API credentials. Never share keys. Trading involves risk of total capital loss.
      </div>

      <h2 style={{marginBottom: '1rem'}}>Active Agents</h2>
      <div className="agents-grid">
        {agents.map((a) => (
          <div key={a.name} className="agent-card">
            <h3>{a.name}</h3>
            <p>{a.role}</p>
            <p className={a.status.includes('Idle') ? 'status-idle' : 'status-online'} style={{marginTop: '0.75rem'}}>
              ● {a.status}
            </p>
          </div>
        ))}
      </div>

      <div className="markets">
        <h2>Primary Focus: Crypto Up/Down Markets</h2>
        <p style={{margin: '1rem 0'}}>High-frequency 5m / 15m / 1h windows on BTC, ETH, SOL, XRP. Strategies emphasize:</p>
        <ul style={{paddingLeft: '1.5rem', marginBottom: '1rem'}}>
          <li>Temporal arbitrage (spot lag vs Polymarket)</li>
          <li>Complete-set arbitrage (YES + NO &lt; $1)</li>
          <li>Market making + liquidity rewards + maker rebates</li>
          <li>Late-window high-probability sniping</li>
          <li>Filtered copy of consistent high-edge wallets</li>
        </ul>
        <p>Orchestrator coordinates signals through the Risk Manager before any execution.</p>
      </div>

      <div style={{marginTop: '2rem', textAlign: 'center', opacity: 0.6}}>
        <p>Repository: <a href="https://github.com/dwcwicofficial/wicai-polymarket-agents" target="_blank">github.com/dwcwicofficial/wicai-polymarket-agents</a></p>
        <p>Next: Connect wallet securely → enable live mode → point wicai.net DNS to this deployment</p>
      </div>
    </div>
  );
}