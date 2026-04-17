import { NextResponse } from 'next/server';
import { parseEntry } from '@/lib/claude';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { input } = await req.json();
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'input required' }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const parsed = await parseEntry(input, today);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'parse error' }, { status: 500 });
  }
}
