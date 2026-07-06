import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '../_utils/session';
import { query } from '../_utils/db';

export async function GET(req) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'admin' && session.role !== 'SK' && session.role !== 'LYDC')) {
      return NextResponse.json({ error: 'ACCESS_DENIED: Unauthorised role.' }, { status: 403 });
    }

    // Query to fetch all approved documents with uploader details
    const res = await query(
      `SELECT d.file_id as "fileId", d.file_name as "name", d.file_url as "url", 
              d.category, d.sub_category as "subCategory", d.user_type as "userType", 
              d.uploaded_by as "uploadedBy", u.display_name as "uploaderName", d.created_at as "date"
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.username
       WHERE d.status = 'Approved'
       ORDER BY d.created_at DESC`
    );

    return NextResponse.json(res.rows);
  } catch (err) {
    console.error('getLibraryDocuments API error:', err);
    return NextResponse.json({ error: 'Failed to fetch library documents.' }, { status: 500 });
  }
}
