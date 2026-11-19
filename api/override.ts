import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './lib/cors';
import turso from './lib/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const b = req.body;
    if (!b.facilityId || !b.slotId) {
      return res.status(400).json({ error: 'facilityId and slotId are required' });
    }

    // Insert the operator booking and update slot atomically
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
  } catch (err) {
    console.error('/api/override error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

