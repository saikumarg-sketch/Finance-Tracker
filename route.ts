import { NextRequest, NextResponse } from 'next/server';
import { redis, KEYS } from '@/lib/redis';
import type { Account, Transaction, DataPayload } from '@/lib/types';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [accounts, transactions] = await Promise.all([
      redis.get<Account[]>(KEYS.accounts),
      redis.get<Transaction[]>(KEYS.transactions),
    ]);

    return NextResponse.json({
      accounts: accounts ?? [],
      transactions: transactions ?? [],
    });
  } catch (error) {
    console.error('GET /api/data error:', error);
    return NextResponse.json(
      { error: 'Failed to load data', accounts: [], transactions: [] },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body: DataPayload = await req.json();
    if (!body || !Array.isArray(body.accounts) || !Array.isArray(body.transactions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await Promise.all([
      redis.set(KEYS.accounts, body.accounts),
      redis.set(KEYS.transactions, body.transactions),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/data error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
