import React, { useState, useCallback, useRef } from 'react';
import type { TextNodeInfo, ReviewResult, GuidelineCache, PluginMessage, HistoryEntry } from '../shared/types';
import { usePluginMessage, postToPlugin } from './hooks/usePluginMessage';
import { reviewTexts } from './services/reviewer';
import { loadBundledGuidelines } from './services/notion';
import ReviewTab from './components/ReviewTab';
import SettingsTab from './components/SettingsTab';

type Tab = 'review' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('review');
  const [texts, setTexts] = useState<TextNodeInfo[]>([]);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [cache, setCache] = useState<GuidelineCache>(() => loadBundledGuidelines());
  const [reviewHistory, setReviewHistory] = useState<HistoryEntry[]>([]);
  const resultsRef = useRef<ReviewResult[]>([]);
  resultsRef.current = results;
  const revertingNodeIds = useRef<Set<string>>(new Set());
  const revertingHistoryNodes = useRef<Set<string>>(new Set());

  // Figma 메시지 수신
  const handleMessage = useCallback((msg: PluginMessage) => {
    if (msg.type === 'selection') {
      setTexts((prev) => {
        const prevIds = prev.map((t) => t.id).join(',');
        const newIds = msg.texts.map((t: TextNodeInfo) => t.id).join(',');
        if (prevIds !== newIds) {
          // 현재 결과가 있으면 히스토리에 저장
          if (resultsRef.current.length > 0) {
            setReviewHistory((h) => [
              { timestamp: Date.now(), results: resultsRef.current },
              ...h,
            ]);
          }
          setResults([]);
        }
        return msg.texts;
      });
    } else if (msg.type === 'replace-result') {
      if (!msg.success) {
        postToPlugin({ type: 'notify', message: `텍스트 교체 실패: ${msg.error || '알 수 없는 오류'}` });
        revertingNodeIds.current.delete(msg.nodeId);
        // Clean up any history revert keys for this nodeId
        for (const key of revertingHistoryNodes.current) {
          if (key.endsWith(`:${msg.nodeId}`)) revertingHistoryNodes.current.delete(key);
        }
        return;
      }

      // Check if this was a revert for current results
      if (revertingNodeIds.current.has(msg.nodeId)) {
        revertingNodeIds.current.delete(msg.nodeId);
        setResults((prev) =>
          prev.map((r) =>
            r.nodeId === msg.nodeId ? { ...r, applied: false } : r
          )
        );
      } else {
        setResults((prev) =>
          prev.map((r) =>
            r.nodeId === msg.nodeId ? { ...r, applied: true } : r
          )
        );
      }

      // Check if this was a revert for history entries
      let historyRevertKey: string | null = null;
      for (const key of revertingHistoryNodes.current) {
        if (key.endsWith(`:${msg.nodeId}`)) {
          historyRevertKey = key;
          break;
        }
      }
      if (historyRevertKey) {
        revertingHistoryNodes.current.delete(historyRevertKey);
        const timestamp = Number(historyRevertKey.split(':')[0]);
        setReviewHistory((prev) =>
          prev.map((entry) =>
            entry.timestamp === timestamp
              ? {
                  ...entry,
                  results: entry.results.map((r) =>
                    r.nodeId === msg.nodeId ? { ...r, applied: false } : r
                  ),
                }
              : entry
          )
        );
      } else {
        // Apply success for history entries
        setReviewHistory((prev) =>
          prev.map((entry) => ({
            ...entry,
            results: entry.results.map((r) =>
              r.nodeId === msg.nodeId ? { ...r, applied: true } : r
            ),
          }))
        );
      }
    }
  }, []);

  usePluginMessage(handleMessage);

  // 검토 실행
  const handleReview = async () => {
    if (texts.length === 0) return;
    setIsReviewing(true);
    try {
      const reviewResults = await reviewTexts(texts, cache);
      setResults(reviewResults);
    } catch (error) {
      postToPlugin({ type: 'notify', message: `검토 실패: ${error}` });
    } finally {
      setIsReviewing(false);
    }
  };

  // 개별 적용
  const handleApply = (result: ReviewResult) => {
    postToPlugin({
      type: 'replace',
      nodeId: result.nodeId,
      newText: result.suggestion,
    });
  };

  // 되돌리기
  const handleRevert = (result: ReviewResult) => {
    revertingNodeIds.current.add(result.nodeId);
    postToPlugin({
      type: 'replace',
      nodeId: result.nodeId,
      newText: result.original,
    });
  };

  // 무시하기
  const handleDismiss = (result: ReviewResult) => {
    setResults((prev) =>
      prev.map((r) =>
        r.nodeId === result.nodeId ? { ...r, dismissed: true } : r
      )
    );
  };

  // 모두 적용
  const handleApplyAll = () => {
    results
      .filter((r) => r.original.trim() !== r.suggestion.trim() && !r.applied && !r.dismissed)
      .forEach((r) => {
        postToPlugin({
          type: 'replace',
          nodeId: r.nodeId,
          newText: r.suggestion,
        });
      });
  };

  // 히스토리 항목 적용
  const handleApplyHistory = (result: ReviewResult, timestamp: number) => {
    postToPlugin({
      type: 'replace',
      nodeId: result.nodeId,
      newText: result.suggestion,
    });
  };

  // 히스토리 항목 무시하기
  const handleDismissHistory = (result: ReviewResult, timestamp: number) => {
    setReviewHistory((prev) =>
      prev.map((entry) =>
        entry.timestamp === timestamp
          ? {
              ...entry,
              results: entry.results.map((r) =>
                r.nodeId === result.nodeId ? { ...r, dismissed: true } : r
              ),
            }
          : entry
      )
    );
  };

  // 히스토리 항목 되돌리기
  const handleRevertHistory = (result: ReviewResult, timestamp: number) => {
    const key = `${timestamp}:${result.nodeId}`;
    revertingHistoryNodes.current.add(key);
    postToPlugin({
      type: 'replace',
      nodeId: result.nodeId,
      newText: result.original,
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 탭 헤더 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('review')}
          className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
            tab === 'review'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          검토
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`flex-1 text-xs py-2.5 font-medium transition-colors ${
            tab === 'settings'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          설정
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'review' ? (
          <ReviewTab
            texts={texts}
            results={results}
            isReviewing={isReviewing}
            hasGuidelines={cache.rules.length > 0}
            onReview={handleReview}
            onApply={handleApply}
            onRevert={handleRevert}
            onDismiss={handleDismiss}
            onApplyAll={handleApplyAll}
            history={reviewHistory}
            onApplyHistory={handleApplyHistory}
            onRevertHistory={handleRevertHistory}
            onDismissHistory={handleDismissHistory}
          />
        ) : (
          <SettingsTab cache={cache} onSync={setCache} />
        )}
      </div>
    </div>
  );
}
