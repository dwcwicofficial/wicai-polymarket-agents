import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getSpotPrices() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 15 } }
    );
    if (!res.ok) throw new Error('CoinGecko failed');
    const data = await res.json();
    return {
      BTC: { price: data.bitcoin?.usd, change24h: data.bitcoin?.usd_24h_change },
      ETH: { price: data.ethereum?.usd, change24h: data.ethereum?.usd_24h_change },
      SOL: { price: data.solana?.usd, change24h: data.solana?.usd_24h_change },
      XRP: { price: data.ripple?.usd, change24h: data.ripple?.usd_24h_change },
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

export async function GET() {
  try {
    const [spot, marketsRes] = await Promise.all([
      getSpotPrices(),
      fetch('https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=60', {
        next: { revalidate: 20 },
      }),
    ]);

    if (!marketsRes.ok) throw new Error('Gamma failed');
    const markets = await marketsRes.json();

    const signals: any[] = [];

    for (const m of markets || []) {
      const q = (m.question || '').toLowerCase();
      const isUpDown = q.includes('up or down') || q.includes('up/down') || q.includes('higher or lower');
      if (!isUpDown) continue;

      let asset = null;
      if (q.includes('bitcoin') || q.includes('btc')) asset = 'BTC';
      else if (q.includes('ethereum') || q.includes('eth')) asset = 'ETH';
      else if (q.includes('solana') || q.includes('sol')) asset = 'SOL';
      else if (q.includes('ripple') || q.includes('xrp')) asset = 'XRP';
      if (!asset || !spot?.[asset]) continue;

      const prices = parsePrices(m.outcomePrices);
      if (prices.length < 2) continue;
      const upProb = prices[0]; // assume first outcome is Up

      const change = spot[asset].change24h || 0;
      // Simple momentum signal: if spot is strongly up and Polymarket Up price is lagging
      const momentumBias = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral';

      let signal = null;
      if (momentumBias === 'up' && upProb < 0.55) {
        signal = {
          type: 'temporal-lag',
          asset,
          question: m.question,
          polymarketUp: upProb.toFixed(3),
          spotPrice: spot[asset].price,
          spot24hChange: change.toFixed(2),
          edge: 'Spot momentum up but Polymarket Up underpriced',
          action: `Consider Up side if window still open and spot continues higher`,
        };
      } else if (momentumBias === 'down' && upProb > 0.45) {
        signal = {
          type: 'temporal-lag',
          asset,
          question: m.question,
          polymarketUp: upProb.toFixed(3),
          spotPrice: spot[asset].price,
          spot24hChange: change.toFixed(2),
          edge: 'Spot momentum down but Polymarket Up overpriced',
          action: `Consider Down side if window still open and spot continues lower`,
        };
      }

      if (signal) signals.push(signal);
    }

    return NextResponse.json({
      agent: 'Strategy Specialists — Temporal Arb',
      status: 'Online',
      scannedAt: new Date().toISOString(),
      spotPrices: spot,
      signalsFound: signals.length,
      signals: signals.slice(0, 8),
      note: 'Paper signals only. Compares 24h spot momentum vs Polymarket Up/Down prices. Real temporal edge is strongest in the final minutes of 5m/15m windows using live Chainlink TWAP vs CLOB.',
    });
  } catch (e: any) {
    return NextResponse.json({
      agent: 'Strategy Specialists — Temporal Arb',
      status: 'Error',
      error: e.message,
      signals: [],
    }, { status: 500 });
  }
}
