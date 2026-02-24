import { useState } from 'react';
import type { TextNodeInfo, ReviewResult, HistoryEntry } from '../../shared/types';
import ReviewCard from './ReviewCard';

interface Props {
  texts: TextNodeInfo[];
  results: ReviewResult[];
  isReviewing: boolean;
  hasGuidelines: boolean;
  onReview: () => void;
  onApply: (result: ReviewResult) => void;
  onRevert: (result: ReviewResult) => void;
  onDismiss: (result: ReviewResult) => void;
  onApplyAll: () => void;
  history: HistoryEntry[];
  onApplyHistory: (result: ReviewResult, timestamp: number) => void;
  onRevertHistory: (result: ReviewResult, timestamp: number) => void;
  onDismissHistory: (result: ReviewResult, timestamp: number) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${h12}:${m}`;
}

function summarizeResults(results: ReviewResult[]): string {
  const total = results.length;
  const fixes = results.filter((r) => r.original.trim() !== r.suggestion.trim()).length;
  if (fixes === 0) return `${total}개 검토, 수정 없음`;
  return `${total}개 검토, ${fixes}개 수정 제안`;
}

export default function ReviewTab({
  texts,
  results,
  isReviewing,
  hasGuidelines,
  onReview,
  onApply,
  onRevert,
  onDismiss,
  onApplyAll,
  history,
  onApplyHistory,
  onRevertHistory,
  onDismissHistory,
}: Props) {
  const fixableResults = results.filter((r) => r.original.trim() !== r.suggestion.trim() && !r.applied && !r.dismissed);
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set());

  const toggleHistory = (timestamp: number) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev);
      if (next.has(timestamp)) next.delete(timestamp);
      else next.add(timestamp);
      return next;
    });
  };

  if (texts.length === 0) {
    return (
      <div className="p-3">
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
          <p className="text-sm font-medium">텍스트를 선택해 주세요</p>
          <p className="text-xs mt-1">Figma 캔버스에서 텍스트가 포함된 레이어를 선택하세요</p>
        </div>
        {history.length > 0 && (
          <HistorySection
            history={history}
            expandedHistory={expandedHistory}
            onToggle={toggleHistory}
            onApply={onApplyHistory}
            onRevert={onRevertHistory}
            onDismiss={onDismissHistory}
          />
        )}
      </div>
    );
  }

  if (!hasGuidelines) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-sm font-medium">가이드라인을 동기화해 주세요</p>
        <p className="text-xs mt-1">설정 탭에서 가이드라인 동기화를 실행해 주세요</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          {texts.length}개 텍스트 선택됨
        </p>
        <div className="flex gap-2">
          {fixableResults.length > 0 && (
            <button
              onClick={onApplyAll}
              className="text-xs px-3 py-1.5 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 transition-colors"
            >
              모두 적용
            </button>
          )}
          <button
            onClick={onReview}
            disabled={isReviewing}
            className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isReviewing ? '검토 중...' : '검토하기'}
          </button>
        </div>
      </div>

      {isReviewing && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="ml-2 text-xs text-gray-500">AI가 검토하고 있어요...</span>
        </div>
      )}

      {results.length > 0 && !isReviewing && (
        fixableResults.length === 0 && results.every((r) => r.dismissed) ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <p className="text-sm font-medium">모든 제안을 무시했어요</p>
            <p className="text-xs mt-1">다시 검토하려면 '검토하기'를 눌러 주세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <ReviewCard key={index} result={result} onApply={onApply} onRevert={onRevert} onDismiss={onDismiss} />
            ))}
          </div>
        )
      )}

      {history.length > 0 && (
        <HistorySection
          history={history}
          expandedHistory={expandedHistory}
          onToggle={toggleHistory}
          onApply={onApplyHistory}
          onRevert={onRevertHistory}
          onDismiss={onDismissHistory}
        />
      )}
    </div>
  );
}

function HistorySection({
  history,
  expandedHistory,
  onToggle,
  onApply,
  onRevert,
  onDismiss,
}: {
  history: HistoryEntry[];
  expandedHistory: Set<number>;
  onToggle: (timestamp: number) => void;
  onApply: (result: ReviewResult, timestamp: number) => void;
  onRevert: (result: ReviewResult, timestamp: number) => void;
  onDismiss: (result: ReviewResult, timestamp: number) => void;
}) {
  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <p className="text-2xs text-gray-400 uppercase font-medium mb-2">이전 검토</p>
      <div className="space-y-1.5">
        {history.map((entry) => {
          const isExpanded = expandedHistory.has(entry.timestamp);
          return (
            <div key={entry.timestamp} className="border border-gray-150 rounded-lg overflow-hidden">
              <button
                onClick={() => onToggle(entry.timestamp)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs text-gray-600">
                  {summarizeResults(entry.results)}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-2xs text-gray-400">{formatTime(entry.timestamp)}</span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {entry.results.map((result, rIdx) => (
                    <ReviewCard
                      key={rIdx}
                      result={result}
                      onApply={(r) => onApply(r, entry.timestamp)}
                      onRevert={(r) => onRevert(r, entry.timestamp)}
                      onDismiss={(r) => onDismiss(r, entry.timestamp)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
