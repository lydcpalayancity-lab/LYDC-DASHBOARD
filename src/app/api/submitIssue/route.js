import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../_utils/session';
import { appendRowToSheet } from '../_utils/auth';
import { query } from '../_utils/db';

export async function POST(req) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'AUTH_EXPIRED: Please log in to submit a concern.' }, { status: 401 });
    }

    const { category, description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    }

    const sheetId = process.env.ISSUE_LOGS_SHEET_ID;
    if (!sheetId) {
      console.warn('Warning: ISSUE_LOGS_SHEET_ID is not configured. Logging locally to audit trail only.');
    } else {
      // Append row to Google Sheets: [Timestamp, Username, Role, Sector_Location, Category, Description, Status]
      try {
        await appendRowToSheet({
          spreadsheetId: sheetId,
          range: 'A:G',
          values: [
            new Date().toISOString(),
            session.username,
            session.role,
            session.barangay || 'N/A',
            category || 'General Concern',
            description,
            'Open'
          ]
        });
      } catch (sheetErr) {
        console.error('Google Sheets log failed:', sheetErr.message);
        // Continue logging locally even if Sheets upload fails
      }
    }

    // Ensure concerns table exists in Supabase
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

    // Insert directly to Supabase concerns table
    await query(`
      INSERT INTO concerns (username, role, barangay, category, description, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      session.username,
      session.role,
      session.barangay || 'N/A',
      category || 'General Concern',
      description,
      'Open'
    ]);

    // Also write to DB audit logs
    await query(
      `INSERT INTO audit_logs (actor, action, details) VALUES ($1, $2, $3)`,
      [
        session.username,
        'CONCERN_SUBMITTED',
        `Concern logged under category "${category || 'General'}": ${description.slice(0, 100)}`
      ]
    );

    return NextResponse.json({ success: true, message: 'Your concern has been logged successfully.' });
  } catch (err) {
    console.error('submitIssue API error:', err);
    return NextResponse.json({ error: 'Failed to submit concern.' }, { status: 500 });
  }
}
