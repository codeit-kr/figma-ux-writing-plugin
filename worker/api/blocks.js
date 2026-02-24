const NOTION_API_BASE = 'https://api.notion.com/v1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  const blockId = req.query.id;
  if (!blockId) {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(400).json({ error: 'Missing block id' });
  }

  const url = new URL(`${NOTION_API_BASE}/blocks/${blockId}/children`);
  if (req.query.page_size) url.searchParams.set('page_size', req.query.page_size);
  if (req.query.start_cursor) url.searchParams.set('start_cursor', req.query.start_cursor);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
    },
  });

  const data = await response.json();
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.status(response.status).json(data);
}
