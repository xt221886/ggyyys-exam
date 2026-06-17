// Simple JSON storage with CORS, using in-memory storage (free Vercel deployment)
let data = { results: [] };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method === 'GET') {
    return res.json(data);
  }
  if (req.method === 'POST') {
    const r = req.body;
    data.results.push(r);
    return res.json({ ok: true, count: data.results.length });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
