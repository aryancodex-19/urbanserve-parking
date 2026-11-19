import { createClient } from '@libsql/client/web';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getTurso() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL is missing');
  return createClient({ url, authToken });
}

function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const turso = getTurso();
    if (req.method === 'GET') {
      const result = await turso.execute(
        'SELECT id, user_id, user_name, booked_by, facility_id, facility_name, slot_id, date, start_time, end_time, time, status, created_at, updated_at FROM bookings ORDER BY created_at DESC'
      );
      const bookings = result.rows.map((row) => ({
        id: row.id as string,
        userId: row.user_id as string,
        userName: row.user_name as string,
        bookedBy: row.booked_by as string,
        facilityId: row.facility_id as string,
        facilityName: row.facility_name as string,
        slotId: row.slot_id as string,
        date: row.date as string,
        startTime: row.start_time as string,
        endTime: row.end_time as string,
        time: row.time as string,
        status: row.status as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
      }));
      return res.status(200).json(bookings);
    }

    if (req.method === 'POST') {
      const b = req.body;
      await turso.batch(
        [
          {
            sql: `INSERT INTO bookings (id, user_id, user_name, booked_by, facility_id, facility_name, slot_id, date, start_time, end_time, time, status, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              b.id, b.userId, b.userName, b.bookedBy,
              b.facilityId, b.facilityName, b.slotId,
              b.date, b.startTime, b.endTime, b.time || '',
              b.status, b.createdAt, b.updatedAt,
            ],
          },
          {
            sql: 'UPDATE slots SET status = ?, last_updated = ? WHERE id = ? AND facility_id = ?',
            args: ['occupied', new Date().toISOString(), b.slotId, b.facilityId],
          },
        ],
        'write'
      );
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PATCH') {
      const { id, status, slotId, facilityId, updatedAt } = req.body;
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }

      const statements: Array<{ sql: string; args: unknown[] }> = [
        {
          sql: 'UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?',
          args: [status, updatedAt || new Date().toISOString(), id],
        },
      ];

      if (slotId && facilityId) {
        if (status === 'Cancelled' || status === 'Completed') {
          statements.push({
            sql: 'UPDATE slots SET status = ?, last_updated = ? WHERE id = ? AND facility_id = ?',
            args: ['available', new Date().toISOString(), slotId, facilityId],
          });
        } else if (status === 'Active') {
          statements.push({
            sql: 'UPDATE slots SET status = ?, last_updated = ? WHERE id = ? AND facility_id = ?',
            args: ['occupied', new Date().toISOString(), slotId, facilityId],
          });
        }
      }

      await turso.batch(statements, 'write');
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: unknown) {
    console.error('/api/bookings error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
