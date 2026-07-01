import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../../_utils/session';
import { query } from '../../_utils/db';

export async function POST(req) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status } = await req.json();

    await query('UPDATE concerns SET status = $1 WHERE id = $2', [status, id]);

    // Log action to audit logs
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [
        session.username,
        'CONCERN_UPDATED',
        `Concern ID ${id} status updated to "${status}"`
      ]
    );

    return NextResponse.json({ success: true, message: 'Status updated successfully.' });
  } catch (err) {
    console.error('updateConcernStatus API error:', err);
    return NextResponse.json({ error: 'Failed to update status.' }, { status: 500 });
  }
}
