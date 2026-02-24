import React from 'react';
import type { ReviewResult } from '../../shared/types';

interface Props {
  result: ReviewResult;
  onApply: (result: ReviewResult) => void;
  onRevert?: (result: ReviewResult) => void;
  onDismiss?: (result: ReviewResult) => void;
}

const BADGE_COLORS: Record<string, string> = {
  '말투': 'bg-blue-100 text-blue-700',
  '단어': 'bg-green-100 text-green-700',
  '버튼': 'bg-purple-100 text-purple-700',
  '문장부호': 'bg-orange-100 text-orange-700',
  '표현': 'bg-pink-100 text-pink-700',
  '없음': 'bg-gray-100 text-gray-500',
};

export default function ReviewCard({ result, onApply, onRevert, onDismiss }: Props) {
  const needsFix = result.original.trim() !== result.suggestion.trim();
  const badgeColor = BADGE_COLORS[result.violationType] || BADGE_COLORS['없음'];

  if (result.dismissed) {
    return null;
  }

  if (!needsFix) {
    return (
      <div className="border border-green-200 rounded-lg p-3 mb-2 bg-green-50">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-green-600 text-xs font-medium">Pass</span>
        </div>
        <p className="text-xs text-gray-600 break-all">{result.original}</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${badgeColor}`}>
          {result.violationType}
        </span>
        {!result.applied ? (
          <div className="flex items-center gap-1.5">
            {onDismiss && (
              <button
                onClick={() => onDismiss(result)}
                className="text-2xs px-2 py-1 border border-gray-300 text-gray-500 rounded hover:bg-gray-100 transition-colors"
              >
                무시하기
              </button>
            )}
            <button
              onClick={() => onApply(result)}
              className="text-2xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              적용하기
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-green-600 font-medium">적용됨</span>
            {onRevert && (
              <button
                onClick={() => onRevert(result)}
                className="text-2xs px-2 py-1 border border-gray-300 text-gray-500 rounded hover:bg-gray-100 transition-colors"
              >
                되돌리기
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div>
          <span className="text-2xs text-gray-400 uppercase">Before</span>
          <p className="text-xs text-red-600 line-through break-all">{result.original}</p>
        </div>
        <div>
          <span className="text-2xs text-gray-400 uppercase">After</span>
          <p className="text-xs text-green-700 font-medium break-all">{result.suggestion}</p>
        </div>
      </div>

      <p className="mt-2 text-2xs text-gray-500">{result.reason}</p>
    </div>
  );
}
