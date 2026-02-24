// Figma ↔ UI 메시지 타입
export interface TextNodeInfo {
  id: string;
  characters: string;
  layerName: string;
  parentName: string;
  componentName: string;
}

export interface SelectionMessage {
  type: 'selection';
  texts: TextNodeInfo[];
}

export interface ReplaceMessage {
  type: 'replace';
  nodeId: string;
  newText: string;
}

export interface ReplaceResultMessage {
  type: 'replace-result';
  nodeId: string;
  success: boolean;
  error?: string;
}

export interface GetStorageMessage {
  type: 'get-storage';
  key: string;
}

export interface SetStorageMessage {
  type: 'set-storage';
  key: string;
  value: string;
}

export interface StorageResultMessage {
  type: 'storage-result';
  key: string;
  value: string | null;
}

export interface NotifyMessage {
  type: 'notify';
  message: string;
}

export type PluginMessage =
  | SelectionMessage
  | ReplaceMessage
  | ReplaceResultMessage
  | GetStorageMessage
  | SetStorageMessage
  | StorageResultMessage
  | NotifyMessage;

// 검토 결과 타입
export interface ReviewResult {
  nodeId: string;
  original: string;
  suggestion: string;
  reason: string;
  violationType: string;
  applied?: boolean;
  dismissed?: boolean;
}

// Notion 규칙 타입
export interface NotionRule {
  ruleName: string;
  category: string;
  badExample: string;
  goodExample: string;
  description: string;
  targets: string[];
  priority: string;
}

// 히스토리 타입
export interface HistoryEntry {
  timestamp: number;
  results: ReviewResult[];
}

// 캐시 타입
export interface GuidelineCache {
  pageText: string;
  rules: NotionRule[];
  timestamp: number;
}
