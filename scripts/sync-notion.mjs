// Notion API에서 가이드라인 데이터를 가져와 JSON으로 저장하는 빌드 스크립트
const WORKER_URL = 'https://figma-ux-writing-plugin-notion-work.vercel.app';
const PAGE_ID = '888ae75fc2964167a8ce5f3767e60280';
const DATABASE_ID = '700da2a92fdd488391334b063044cf09';

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = __dirname + '/../src/ui/data/guidelines.json';

function extractRichText(richText) {
  if (!Array.isArray(richText)) return '';
  return richText.map((t) => t.plain_text || '').join('');
}

function extractBlockText(block) {
  const data = block[block.type];
  if (!data) return '';
  if (data.rich_text) return extractRichText(data.rich_text);
  return '';
}

async function fetchBlocks(blockId) {
  const lines = [];
  let cursor;

  do {
    const url = new URL(`${WORKER_URL}/blocks/${blockId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`Notion Blocks API error: ${res.status} ${await res.text()}`);
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

async function fetchDatabase() {
  const rules = [];
  let cursor;

  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`${WORKER_URL}/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Notion Database API error: ${res.status} ${await res.text()}`);
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
        targets: (props['적용 대상']?.multi_select || []).map((s) => s.name),
        priority: props['우선순위']?.select?.name || '',
      });
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return rules;
}

async function main() {
  console.log('Notion 가이드라인 동기화 중...');

  const [lines, rules] = await Promise.all([
    fetchBlocks(PAGE_ID),
    fetchDatabase(),
  ]);

  const output = {
    pageText: lines.join('\n'),
    rules,
    syncedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`완료! ${rules.length}개 규칙 저장됨 → src/ui/data/guidelines.json`);
}

main().catch((err) => {
  console.error('동기화 실패:', err);
  process.exit(1);
});
