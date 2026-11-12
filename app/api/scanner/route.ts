import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://gamma-api.polymarket.com/markets?closed=false&limit=30', {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error('Gamma API error');
    const markets = await res.json();

    const cryptoMarkets = (markets || []).filter((m: any) => {
      const q = (m.question || '').toLowerCase();
      const tags = (m.tags || []).map((t: any) => (t.label || '').toLowerCase());
      return (
        q.includes('bitcoin') || q.includes('btc') ||
        q.includes('ethereum') || q.includes('eth') ||
        q.includes('solana') || q.includes('sol') ||
        q.includes('up or down') || q.includes('up/down') ||
        tags.some((t: string) => t.includes('crypto') || t.includes('bitcoin'))
      );
    }).slice(0, 12).map((m: any) => ({
      id: m.id || m.conditionId,
      question: m.question,
      volume: m.volume,
      liquidity: m.liquidity,
      endDate: m.endDate,
      outcomePrices: m.outcomePrices,
    }));

    return NextResponse.json({
      agent: 'Scanner Agent',
      status: 'Online',
      scannedAt: new Date().toISOString(),
      totalMarketsFetched: markets.length,
      cryptoRelevant: cryptoMarkets.length,
      markets: cryptoMarkets,
    });
  } catch (e: any) {
    return NextResponse.json({
      agent: 'Scanner Agent',
      status: 'Error',
      error: e.message,
      markets: [],
    }, { status: 500 });
  }
}
