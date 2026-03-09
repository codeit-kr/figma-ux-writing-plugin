import type { GuidelineCache, NotionRule } from '../../shared/types';

const WORKER_BASE_URL = 'https://figma-ux-writing-plugin-notion-work.vercel.app';
const PLUGIN_ACCESS_KEY = 'b8de025689212511eab151c93f4a69c5';

const DATABASE_ID = '700da2a92fdd488391334b063044cf09';

function extractRichText(richText: Array<{ plain_text?: string }>): string {
  if (!Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

async function fetchDatabase(): Promise<NotionRule[]> {
  const rules: NotionRule[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`${WORKER_BASE_URL}/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': PLUGIN_ACCESS_KEY },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Worker Database API error: ${res.status}`);
    }

    const data = await res.json();

    for (const page of data.results) {
      const props = page.properties;
      rules.push({
        ruleName: extractRichText(props['규칙명']?.title || []),
        category: props['카테고리']?.select?.name || '',
        badExample: extractRichText(props['잘못된 예시']?.rich_text || []),
        goodExample: extractRichText(props['올바른 예시']?.rich_text || []),
        description: extractRichText(props['설명']?.rich_text || []),
        targets: (props['적용 대상']?.multi_select || []).map((s: { name: string }) => s.name),
        priority: props['우선순위']?.select?.name || '',
      });
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return rules;
}

export async function syncFromWorker(): Promise<GuidelineCache> {
  const rules = await fetchDatabase();

  return {
    rules,
    timestamp: Date.now(),
  };
}
