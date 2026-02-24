const WORKER_URL = 'https://figma-ux-writing-plugin-notion-work.vercel.app';

export interface ReviewResponse {
  results: {
    id: number;
    original: string;
    suggestion: string;
    reason: string;
    violation_type: string;
  }[];
}

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<ReviewResponse> {
  const res = await fetch(`${WORKER_URL}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ systemPrompt, userPrompt }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${res.status} - ${error?.error?.message || res.statusText}`,
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty response');

  const parsed = JSON.parse(content);

  if (!Array.isArray(parsed.results)) {
    throw new Error('AI 응답에 results 배열이 없습니다');
  }

  for (const item of parsed.results) {
    if (
      typeof item.id !== 'number' ||
      typeof item.original !== 'string' ||
      typeof item.suggestion !== 'string' ||
      typeof item.reason !== 'string' ||
      typeof item.violation_type !== 'string'
    ) {
      throw new Error('AI 응답 항목의 필수 필드가 누락되었습니다');
    }
  }

  return parsed as ReviewResponse;
}
