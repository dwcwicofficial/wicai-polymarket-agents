import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Paper bankroll for sizing demos
const PAPER_BANKROLL = 10000;
const KELLY_FRACTION = 0.25; // 1/4 Kelly
const MAX_PER_TRADE_PCT = 0.02; // hard cap 2%
const MAX_TOTAL_EXPOSURE_PCT = 0.15;

function kellySize(edge: number, bankroll: number): number {
  // edge is decimal (e.g. 0.08 for 8%)
  // Simplified Kelly: f* ≈ edge (for near-even markets)
  const fullKelly = Math.max(0, Math.min(edge, 0.25));
  const fractional = fullKelly * KELLY_FRACTION;
  const capped = Math.min(fractional, MAX_PER_TRADE_PCT);
  return bankroll * capped;
}

export async function GET() {
  try {
    // Pull latest signals from the other agents
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const [arbRes, statRes, temporalRes] = await Promise.allSettled([
      fetch(`${base}/api/arb`, { cache: 'no-store' }),
      fetch(`${base}/api/statarb`, { cache: 'no-store' }),
      fetch(`${base}/api/temporal`, { cache: 'no-store' }),
    ]);

    const arb = arbRes.status === 'fulfilled' && arbRes.value.ok ? await arbRes.value.json() : { opportunities: [] };
    const stat = statRes.status === 'fulfilled' && statRes.value.ok ? await statRes.value.json() : { signals: [] };
    const temporal = temporalRes.status === 'fulfilled' && temporalRes.value.ok ? await temporalRes.value.json() : { signals: [] };

    const sized: any[] = [];

    // Size complete-set arbs
    for (const o of (arb.opportunities || []).slice(0, 5)) {
      const edge = parseFloat(o.edgePct) / 100;
      const size = kellySize(edge, PAPER_BANKROLL);
      if (size >= 10) {
        sized.push({
          source: 'complete-set',
          question: o.question,
          edgePct: o.edgePct,
          recommendedSize: Math.round(size),
          kellyFraction: KELLY_FRACTION,
          rationale: `1/4 Kelly on ${o.edgePct}% edge, capped at 2%`,
        });
      }
    }

    // Size statistical signals
    for (const s of (stat.signals || []).slice(0, 5)) {
      const edge = Math.abs(parseFloat(s.deviation)) / 100;
      const size = kellySize(edge * 0.7, PAPER_BANKROLL); // slightly more conservative
      if (size >= 10) {
        sized.push({
          source: 'statistical',
          question: s.question,
          edgePct: (edge * 100).toFixed(1),
          recommendedSize: Math.round(size),
          kellyFraction: KELLY_FRACTION,
          rationale: `1/4 Kelly on ${s.signal} (${s.deviation}% deviation)`,
        });
      }
    }

    // Size temporal signals (more conservative)
    for (const s of (temporal.signals || []).slice(0, 3)) {
      const size = kellySize(0.04, PAPER_BANKROLL); // fixed small edge assumption
      sized.push({
        source: 'temporal',
        question: s.question,
        edgePct: '~4',
        recommendedSize: Math.round(size),
        kellyFraction: KELLY_FRACTION,
        rationale: 'Conservative 1/4 Kelly on temporal lag signal',
      });
    }

    const totalExposure = sized.reduce((sum, s) => sum + s.recommendedSize, 0);
    const exposurePct = (totalExposure / PAPER_BANKROLL) * 100;

    return NextResponse.json({
      agent: 'Risk Manager',
      status: 'Online',
      mode: 'paper',
      bankroll: PAPER_BANKROLL,
      kellyFraction: KELLY_FRACTION,
      maxPerTradePct: MAX_PER_TRADE_PCT * 100,
      maxTotalExposurePct: MAX_TOTAL_EXPOSURE_PCT * 100,
      sizedPositions: sized,
      totalRecommendedExposure: totalExposure,
      totalExposurePct: exposurePct.toFixed(1),
      withinLimits: exposurePct <= MAX_TOTAL_EXPOSURE_PCT * 100,
      note: 'Paper sizing only. No orders placed. Real capital requires wallet connection and live CLOB execution.',
    });
  } catch (e: any) {
    return NextResponse.json({
      agent: 'Risk Manager',
      status: 'Error',
      error: e.message,
      sizedPositions: [],
    }, { status: 500 });
  }
}
