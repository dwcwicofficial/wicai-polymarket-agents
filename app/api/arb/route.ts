import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parsePrices(raw: any): number[] {
  try {
    if (Array.isArray(raw)) return raw.map(Number);
    if (typeof raw === 'string') return JSON.parse(raw).map(Number);
    return [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const res = await fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=50', {
      next: { revalidate: 20 },
    });
    if (!res.ok) throw new Error('Gamma fetch failed');
    const markets = await res.json();

    const opportunities: any[] = [];

    for (const m of markets || []) {
      const prices = parsePrices(m.outcomePrices);
      if (prices.length < 2) continue;

      const yes = prices[0];
      const no = prices[1];
      const sum = yes + no;

      // Complete-set arb: buy both sides for less than $1, redeem for $1
      // Use a small buffer for fees/slippage
      if (sum < 0.985 && yes > 0.01 && no > 0.01) {
        const edge = (1 - sum) * 100;
        opportunities.push({
          id: m.id,
          question: m.question,
          yesPrice: yes.toFixed(3),
          noPrice: no.toFixed(3),
          sum: sum.toFixed(3),
          edgePct: edge.toFixed(2),
          volume: m.volume,
          liquidity: m.liquidity,
          type: 'complete-set',
          action: `Buy YES @ ${yes.toFixed(3)} + NO @ ${no.toFixed(3)} → redeem for $1.00 (edge ~${edge.toFixed(2)}%)`,
        });
      }
    }

    // Sort by edge descending
    opportunities.sort((a, b) => parseFloat(b.edgePct) - parseFloat(a.edgePct));

    return NextResponse.json({
      agent: 'Strategy Specialists — Arb',
      status: 'Online',
      scannedAt: new Date().toISOString(),
      marketsScanned: markets.length,
      opportunitiesFound: opportunities.length,
      opportunities: opportunities.slice(0, 10),
      note: 'Uses Gamma outcomePrices (mid/last). Real execution requires CLOB best-ask confirmation and fees.',
    });
  } catch (e: any) {
    return NextResponse.json({
      agent: 'Strategy Specialists — Arb',
      status: 'Error',
      error: e.message,
      opportunities: [],
    }, { status: 500 });
  }
}
