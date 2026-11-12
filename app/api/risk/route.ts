import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Risk Manager — Fractional Kelly Position Sizing
 *
 * Paper-mode only. Sizes signals from other agents using 1/4 Kelly
 * with hard risk caps. No real orders are placed.
 */

const PAPER_BANKROLL = 10000;
const KELLY_FRACTION = 0.25;          // 1/4 Kelly
const MAX_PER_TRADE_PCT = 0.02;       // 2% hard cap
const MAX_TOTAL_EXPOSURE_PCT = 0.15;  // 15% portfolio cap
const MIN_SIZE = 10;

/**
 * Simplified Kelly for near-even binary markets:
 * f* ≈ edge (decimal)
 * Then apply fractional Kelly and hard caps.
 */
function kellySize(edgeDecimal: number, bankroll: number): number {
  const fullKelly = Math.max(0, Math.min(edgeDecimal, 0.30));
  const fractional = fullKelly * KELLY_FRACTION;
  const capped = Math.min(fractional, MAX_PER_TRADE_PCT);
  return Math.round(bankroll * capped);
}

export async function GET() {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const [arbRes, statRes, temporalRes] = await Promise.allSettled([
      fetch(`${base}/api/arb`, { cache: 'no-store' }),
      fetch(`${base}/api/statarb`, { cache: 'no-store' }),
      fetch(`${base}/api/temporal`, { cache: 'no-store' }),
    ]);

    const arb = arbRes.status === 'fulfilled' && arbRes.value.ok
      ? await arbRes.value.json()
      : { opportunities: [] };
    const stat = statRes.status === 'fulfilled' && statRes.value.ok
      ? await statRes.value.json()
      : { signals: [] };
    const temporal = temporalRes.status === 'fulfilled' && temporalRes.value.ok
      ? await temporalRes.value.json()
      : { signals: [] };

    const sized: any[] = [];

    // --- Complete-set arbitrage (highest confidence) ---
    for (const o of (arb.opportunities || []).slice(0, 5)) {
      const edge = parseFloat(o.edgePct) / 100;
      const size = kellySize(edge, PAPER_BANKROLL);
      if (size >= MIN_SIZE) {
        sized.push({
          source: 'complete-set',
          question: o.question,
          edgePct: o.edgePct,
          recommendedSize: size,
          kellyFraction: KELLY_FRACTION,
          confidence: 'high',
          rationale: `1/4 Kelly on ${o.edgePct}% complete-set edge, hard-capped at 2%`,
        });
      }
    }

    // --- Statistical fair-value deviations ---
    for (const s of (stat.signals || []).slice(0, 5)) {
      const edge = Math.abs(parseFloat(s.deviation)) / 100;
      const size = kellySize(edge * 0.65, PAPER_BANKROLL); // haircut for model risk
      if (size >= MIN_SIZE) {
        sized.push({
          source: 'statistical',
          question: s.question,
          edgePct: (edge * 100).toFixed(1),
          recommendedSize: size,
          kellyFraction: KELLY_FRACTION,
          confidence: 'medium',
          rationale: `1/4 Kelly (haircut) on ${s.signal} — ${s.deviation}% deviation from fair value`,
        });
      }
    }

    // --- Temporal lag signals (lowest confidence) ---
    for (const s of (temporal.signals || []).slice(0, 3)) {
      const size = kellySize(0.035, PAPER_BANKROLL); // conservative fixed edge
      if (size >= MIN_SIZE) {
        sized.push({
          source: 'temporal',
          question: s.question,
          edgePct: '~3.5',
          recommendedSize: size,
          kellyFraction: KELLY_FRACTION,
          confidence: 'low',
          rationale: 'Conservative 1/4 Kelly on temporal lag (fixed small edge)',
        });
      }
    }

    // Sort by size descending
    sized.sort((a, b) => b.recommendedSize - a.recommendedSize);

    const totalExposure = sized.reduce((sum, s) => sum + s.recommendedSize, 0);
    const exposurePct = (totalExposure / PAPER_BANKROLL) * 100;

    // Simple drawdown guard (paper): if total exposure would exceed cap, scale down
    let scaled = sized;
    if (exposurePct > MAX_TOTAL_EXPOSURE_PCT * 100 && sized.length > 0) {
      const scale = (MAX_TOTAL_EXPOSURE_PCT * PAPER_BANKROLL) / totalExposure;
      scaled = sized.map(s => ({
        ...s,
        recommendedSize: Math.round(s.recommendedSize * scale),
        rationale: s.rationale + ' (scaled to fit total exposure cap)',
      }));
    }

    const finalTotal = scaled.reduce((sum, s) => sum + s.recommendedSize, 0);

    return NextResponse.json({
      agent: 'Risk Manager',
      status: 'Online',
      mode: 'paper',
      bankroll: PAPER_BANKROLL,
      kellyFraction: KELLY_FRACTION,
      maxPerTradePct: MAX_PER_TRADE_PCT * 100,
      maxTotalExposurePct: MAX_TOTAL_EXPOSURE_PCT * 100,
      sizedPositions: scaled,
      totalRecommendedExposure: finalTotal,
      totalExposurePct: ((finalTotal / PAPER_BANKROLL) * 100).toFixed(1),
      withinLimits: finalTotal <= MAX_TOTAL_EXPOSURE_PCT * PAPER_BANKROLL,
      positionsCount: scaled.length,
      note: 'Paper sizing only. No orders placed. Real capital requires secure wallet connection and CLOB execution.',
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
