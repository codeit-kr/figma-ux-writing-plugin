import type { TextNodeInfo, ReviewResult, GuidelineCache, NotionRule } from '../../shared/types';
import { callOpenAI, type ReviewResponse } from './openai';

// 타겟별 컴포넌트명/프레임명/레이어명 매칭 키워드
const TARGET_KEYWORDS: Record<string, RegExp> = {
  '인풋': /input|인풋|placeholder|text\s?field|text\s?area/i,
  '토스트': /toast|토스트|snackbar|스낵바/i,
  '툴팁': /tooltip|툴팁/i,
  '헬퍼텍스트': /helper|헬퍼텍스트/i,
  '모달': /modal|모달|dialog|다이얼로그|popup|팝업/i,
  '버튼': /button|버튼|btn|cta/i,
};

function matchesTarget(target: string, text: TextNodeInfo): boolean {
  if (target === '전체') return true;
  const regex = TARGET_KEYWORDS[target];
  if (!regex) return true; // 알 수 없는 타겟은 포함
  const context = `${text.componentName} ${text.parentName} ${text.layerName}`;
  return regex.test(context);
}

function filterRulesForTexts(rules: NotionRule[], texts: TextNodeInfo[]): NotionRule[] {
  return rules.filter((rule) => {
    // "전체" 타겟 규칙은 항상 포함
    if (rule.targets.includes('전체')) return true;
    // 하나라도 매칭되는 텍스트가 있으면 규칙 포함
    return texts.some((text) =>
      rule.targets.some((target) => matchesTarget(target, text))
    );
  });
}

function buildSystemPrompt(rules: NotionRule[]): string {
  const rulesSection = rules.map((rule) => {
    const targets = rule.targets.join(', ');
    return `### ${rule.ruleName} [${rule.category}] (${rule.priority})
적용 대상: ${targets}
설명: ${rule.description}
잘못된 예시: ${rule.badExample}
올바른 예시: ${rule.goodExample}`;
  }).join('\n\n');

  return `당신은 코드잇의 UX writing 검토 전문가입니다.
아래 규칙을 기반으로 주어진 UI 텍스트를 검토하고, 규칙에 위반되는 부분이 있으면 교정 제안을 해주세요.

## 규칙
${rulesSection}

## 응답 형식
반드시 다음 JSON 형식으로 응답하세요. 각 결과의 id는 입력 텍스트의 id와 동일해야 합니다:
{
  "results": [
    {
      "id": 1,
      "original": "원본 텍스트",
      "suggestion": "교정된 텍스트 (수정이 필요 없으면 원본과 동일)",
      "reason": "교정 사유 (한국어로)",
      "violation_type": "위반 규칙 카테고리 (말투/단어/버튼/문장부호/표현/없음)"
    }
  ]
}

## 중요 규칙
- 수정이 필요 없는 텍스트는 original과 suggestion을 동일하게, violation_type을 "없음"으로 설정하세요.
- 여러 규칙에 위반되는 경우 가장 중요한 위반 하나를 기준으로 교정하세요.
- 교정 시 원래 텍스트의 의미와 문법을 보존하세요. 불필요한 조사 변경이나 단어 삭제를 하지 마세요.`;
}

function buildUserPrompt(texts: TextNodeInfo[]): string {
  const items = texts.map((t, i) => {
    let item = `- id: ${i + 1}
  텍스트: "${t.characters}"
  레이어: ${t.layerName}
  부모 프레임: ${t.parentName}`;
    if (t.componentName) item += `\n  컴포넌트: ${t.componentName}`;
    return item;
  }).join('\n');

  return `다음 UI 텍스트들을 검토해 주세요:\n\n${items}`;
}

export async function reviewTexts(
  texts: TextNodeInfo[],
  cache: GuidelineCache,
): Promise<ReviewResult[]> {
  if (texts.length === 0) return [];

  const filteredRules = filterRulesForTexts(cache.rules, texts);
  const systemPrompt = buildSystemPrompt(filteredRules);
  const userPrompt = buildUserPrompt(texts);

  const response = await callOpenAI(systemPrompt, userPrompt);

  // Build a map from 1-based id to text node
  const textById = new Map(texts.map((t, i) => [i + 1, t]));

  return response.results.map((result: ReviewResponse['results'][number]) => {
    const text = textById.get(result.id);
    return {
      nodeId: text?.id || '',
      original: result.original,
      suggestion: result.suggestion,
      reason: result.reason,
      violationType: result.violation_type,
    };
  }).filter((r) => r.nodeId !== '');
}
