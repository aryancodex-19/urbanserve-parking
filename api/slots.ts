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
        'SELECT id, facility_id, status, last_updated FROM slots ORDER BY facility_id, id'
      );

      const facilitiesDataMap: Record<
        string,
        { slots: Array<{ id: string; status: string; lastUpdated: string }>; lastUpdated: string }
      > = {};

      for (const row of result.rows) {
        const facId = row.facility_id as string;
        if (!facilitiesDataMap[facId]) {
          facilitiesDataMap[facId] = { slots: [], lastUpdated: '' };
        }
        facilitiesDataMap[facId].slots.push({
          id: row.id as string,
          status: row.status as string,
          lastUpdated: row.last_updated as string,
        });
        const ts = row.last_updated as string;
        if (!facilitiesDataMap[facId].lastUpdated || ts > facilitiesDataMap[facId].lastUpdated) {
          facilitiesDataMap[facId].lastUpdated = ts;
        }
      }

      return res.status(200).json(facilitiesDataMap);
    }

    if (req.method === 'PATCH') {
      const { facilityId, slotId, status } = req.body;
      if (!facilityId || !slotId || !status) {
        return res.status(400).json({ error: 'facilityId, slotId, and status are required' });
      }

      const now = new Date().toISOString();
      await turso.execute({
        sql: 'UPDATE slots SET status = ?, last_updated = ? WHERE id = ? AND facility_id = ?',
        args: [status, now, slotId, facilityId],
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: unknown) {
    console.error('/api/slots error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err),
    });
  }
}
