const NOTION_API_BASE = 'https://api.notion.com/v1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // Verify shared secret
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.PLUGIN_ACCESS_KEY) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbId = req.query.id;
  if (!dbId) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(400).json({ error: 'Missing database id' });
  }

  const response = await fetch(`${NOTION_API_BASE}/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req.body || {}),
  });

  const data = await response.json();
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.status(response.status).json(data);
}
