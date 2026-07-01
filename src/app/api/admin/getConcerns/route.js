import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../_utils/session';
import { query } from '../../_utils/db';

export async function GET(req) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS concerns (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        username VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL,
        barangay VARCHAR(100),
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'Open'
      )
    `);

    const result = await query('SELECT * FROM concerns ORDER BY timestamp DESC');
    return NextResponse.json(result);
  } catch (err) {
    console.error('getConcerns API error:', err);
    return NextResponse.json({ error: 'Failed to fetch concerns.' }, { status: 500 });
  }
}
