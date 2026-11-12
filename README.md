# WICAI Polymarket Agents

Multi-agent AI system designed for Polymarket crypto markets (primarily short-horizon Up/Down on BTC/ETH/SOL).

## Architecture
- Scanner: Gamma + CLOB + external price feeds
- Forecasting Ensemble: statistical models + LLM research
- Strategy Specialists: Arb, MM, Sniper, Copy
- Risk Manager: position sizing and hard limits
- Execution: official Polymarket CLOB client
- Monitor: performance and adaptation loop

## Deployment
Deployed on Vercel. Domain target: wicai.net (GoDaddy DNS pointing to Vercel).

## Important
This is a dashboard and orchestration framework. Live trading requires your own wallet keys (never commit them) and carries substantial risk of capital loss. Start with paper trading.

## Next steps
1. Add secure wallet integration (client-side or encrypted env)
2. Implement live CLOB order logic behind risk checks
3. Wire real-time WebSocket market data
4. Backtest and paper-trade before scaling capital
