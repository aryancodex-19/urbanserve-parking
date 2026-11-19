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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const turso = getTurso();
    const result = await turso.execute('SELECT id, name, address, lat, lng, total_slots, rate, zones FROM facilities');
    const facilities = result.rows.map((row) => ({
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
  } catch (err: unknown) {
    console.error('GET /api/facilities error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
