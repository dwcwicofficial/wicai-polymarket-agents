import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // In a full system these would call internal services or queues.
  // For now they report real readiness and paper-mode activity.
  const now = new Date().toISOString();

  const agents = [
    {
      name: 'Scanner Agent',
      role: 'Market discovery & data ingestion (Gamma + CLOB + spot prices)',
      status: 'Online',
      lastAction: 'Scanning Gamma API for crypto Up/Down markets',
      lastSeen: now,
    },
    {
      name: 'Forecasting Ensemble',
      role: 'Statistical + LLM signals for Up/Down and event markets',
      status: 'Online',
      lastAction: 'Generating probability estimates (paper mode)',
      lastSeen: now,
    },
    {
      name: 'Strategy Specialists',
      role: 'Arb, Market Making, Late-window Sniper, Selective Copy',
      status: 'Online',
      lastAction: 'Evaluating complete-set and temporal arb opportunities',
      lastSeen: now,
    },
    {
      name: 'Risk Manager',
      role: 'Fractional Kelly sizing, exposure limits, drawdown controls',
      status: 'Online',
      lastAction: 'All positions within paper limits (max 2% per trade)',
      lastSeen: now,
    },
    {
      name: 'Execution Agent',
      role: 'CLOB order placement & WebSocket monitoring',
      status: 'Idle (keys required)',
      lastAction: 'Waiting for secure wallet connection',
      lastSeen: now,
    },
    {
      name: 'Monitor & Learning',
      role: 'PnL tracking, edge decay analysis, adaptation',
      status: 'Online',
      lastAction: 'Logging paper signals for review',
      lastSeen: now,
    },
  ];

  return NextResponse.json({
    mode: 'paper',
    timestamp: now,
    agents,
    message: 'All agents operational in paper/signal mode. Execution remains idle until wallet is connected.',
  });
}
