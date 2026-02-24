import React, { useState } from 'react';
import type { GuidelineCache } from '../../shared/types';
import { syncFromWorker } from '../services/notion';

interface Props {
  cache: GuidelineCache;
  onSync: (cache: GuidelineCache) => void;
}

export default function SettingsTab({ cache, onSync }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const syncTime = new Date(cache.timestamp).toLocaleString('ko-KR');

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const newCache = await syncFromWorker();
      onSync(newCache);
      setSyncMessage({ text: `${newCache.rules.length}개 규칙 동기화 완료`, isError: false });
    } catch (error) {
      setSyncMessage({ text: `동기화 실패: ${error}`, isError: true });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <section>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">AI 모델</h3>
        <p className="text-2xs text-gray-500">GPT-4o-mini (OpenAI)</p>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">가이드라인</h3>
        <div className="text-2xs text-gray-500 space-y-1">
          <p>규칙 {cache.rules.length}개 로드됨</p>
          <p>마지막 동기화: {syncTime}</p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="mt-3 w-full py-1.5 text-2xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing ? '동기화 중...' : '가이드라인 동기화'}
        </button>
        {syncMessage && (
          <p className={`mt-2 text-2xs ${syncMessage.isError ? 'text-red-500' : 'text-green-600'}`}>
            {syncMessage.text}
          </p>
        )}
      </section>
    </div>
  );
}
