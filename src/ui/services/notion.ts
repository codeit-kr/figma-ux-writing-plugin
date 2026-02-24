import type { GuidelineCache, NotionRule } from '../../shared/types';
import guidelinesData from '../data/guidelines.json';

const WORKER_BASE_URL = 'https://figma-ux-writing-plugin-notion-work.vercel.app';

const PAGE_ID = '888ae75fc2964167a8ce5f3767e60280';
const DATABASE_ID = '700da2a92fdd488391334b063044cf09';

export function loadBundledGuidelines(): GuidelineCache {
  return {
    pageText: guidelinesData.pageText,
    rules: guidelinesData.rules,
    timestamp: new Date(guidelinesData.syncedAt).getTime(),
  };
}

function extractRichText(richText: Array<{ plain_text?: string }>): string {
  if (!Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

function extractBlockText(block: Record<string, any>): string {
  const data = block[block.type];
  if (!data) return '';
  if (data.rich_text) return extractRichText(data.rich_text);
  return '';
}

async function fetchBlocks(blockId: string): Promise<string[]> {
  const lines: string[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${WORKER_BASE_URL}/blocks/${blockId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Worker Blocks API error: ${res.status}`);
    }

    const data = await res.json();

    for (const block of data.results) {
      const text = extractBlockText(block);
      if (text) {
        const prefix =
          block.type === 'heading_1' ? '# ' :
          block.type === 'heading_2' ? '## ' :
          block.type === 'heading_3' ? '### ' :
          block.type === 'bulleted_list_item' ? '- ' :
          block.type === 'numbered_list_item' ? '- ' :
          block.type === 'callout' ? '> ' : '';
        lines.push(prefix + text);
      }
      if (block.has_children) {
        const childLines = await fetchBlocks(block.id);
        lines.push(...childLines);
      }
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return lines;
}

async function fetchDatabase(): Promise<NotionRule[]> {
  const rules: NotionRule[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`${WORKER_BASE_URL}/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const [lines, rules] = await Promise.all([
    fetchBlocks(PAGE_ID),
    fetchDatabase(),
  ]);

  return {
    pageText: lines.join('\n'),
    rules,
    timestamp: Date.now(),
  };
}
