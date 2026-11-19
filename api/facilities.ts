import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './lib/cors';
import turso from './lib/turso';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await turso.execute('SELECT id, name, address, lat, lng, total_slots, rate, zones FROM facilities');
    const facilities = result.rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      address: row.address as string,
      lat: row.lat as number,
      lng: row.lng as number,
      totalSlots: row.total_slots as number,
      rate: row.rate as string,
      zones: JSON.parse(row.zones as string),
    }));
    return res.status(200).json(facilities);
  } catch (err) {
    console.error('GET /api/facilities error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

