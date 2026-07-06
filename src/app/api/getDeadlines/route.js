import { NextResponse } from 'next/server';
import { query } from '../_utils/db';

export async function GET() {
  try {
    const res = await query('SELECT id, title, date, target_role FROM deadlines ORDER BY date ASC');
    return NextResponse.json(res.rows);
  } catch (err) {
    console.error('getDeadlines API error:', err);
    return NextResponse.json({ error: 'Failed to load deadlines.' }, { status: 500 });
  }
}
