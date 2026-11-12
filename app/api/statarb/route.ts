import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getSpot() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 15 } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    return {
      BTC: { price: d.bitcoin?.usd, chg: d.bitcoin?.usd_24h_change || 0 },
      ETH: { price: d.ethereum?.usd, chg: d.ethereum?.usd_24h_change || 0 },
      SOL: { price: d.solana?.usd, chg: d.solana?.usd_24h_change || 0 },
    };
  } catch {
    return null;
  }
}

function parsePrices(raw: any): number[] {
  try {
    if (Array.isArray(raw)) return raw.map(Number);
    if (typeof raw === 'string') return JSON.parse(raw).map(Number);
    return [];
  } catch {
    return [];
  }
}

// Simple statistical fair-value model:
// Base 50% + momentum adjustment (capped). Larger |24h change| shifts fair Up probability.
function fairUpProb(change24h: number): number {
  const adj = Math.max(-0.25, Math.min(0.25, change24h / 20));
  return 0.5 + adj;
}

export async function GET() {
  try {
    const [spot, marketsRes] = await Promise.all([
      getSpot(),
      fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=50', {
        next: { revalidate: 20 },
      }),
    ]);
    if (!marketsRes.ok) throw new Error('Gamma failed');
    const markets = await marketsRes.json();

    const signals: any[] = [];

    for (const m of markets || []) {
      const q = (m.question || '').toLowerCase();
      if (!q.includes('up or down') && !q.includes('up/down')) continue;

      let asset: 'BTC' | 'ETH' | 'SOL' | null = null;
      if (q.includes('bitcoin') || q.includes('btc')) asset = 'BTC';
      else if (q.includes('ethereum') || q.includes('eth')) asset = 'ETH';
      else if (q.includes('solana') || q.includes('sol')) asset = 'SOL';
      if (!asset || !spot?.[asset]) continue;

      const prices = parsePrices(m.outcomePrices);
      if (prices.length < 2) continue;
      const marketUp = prices[0];
      const fair = fairUpProb(spot[asset].chg);
      const deviation = marketUp - fair;

      // Flag if market is more than 8% away from statistical fair value
      if (Math.abs(deviation) > 0.08) {
        signals.push({
          asset,
          question: m.question,
          marketUp: marketUp.toFixed(3),
          fairValue: fair.toFixed(3),
          deviation: (deviation * 100).toFixed(1),
          spotChange: spot[asset].chg.toFixed(2),
          signal: deviation > 0 ? 'Overpriced Up (fade)' : 'Underpriced Up (buy)',
          edge: Math.abs(deviation * 100).toFixed(1) + '% statistical deviation',
        });
      }
    }

    signals.sort((a, b) => Math.abs(parseFloat(b.deviation)) - Math.abs(parseFloat(a.deviation)));

    return NextResponse.json({
      agent: 'Forecasting Ensemble — Statistical Arb',
      status: 'Online',
      scannedAt: new Date().toISOString(),
      model: 'Momentum-adjusted fair value (base 50% ± 24h change/20, capped ±25%)',
      signalsFound: signals.length,
      signals: signals.slice(0, 8),
      note: 'Paper signals. Model is a simple statistical baseline. Real systems add order-book imbalance, time-to-expiry, and cross-asset correlations.',
    });
  } catch (e: any) {
    return NextResponse.json({
      agent: 'Forecasting Ensemble — Statistical Arb',
      status: 'Error',
      error: e.message,
      signals: [],
    }, { status: 500 });
  }
}
