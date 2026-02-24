# Codeit UX Writing Checker

코드잇의 [UX Writing 규칙 DB](https://www.notion.so/codeit/UX-writing-888ae75fc2964167a8ce5f3767e60280?source=copy_link)를 기반으로 Figma 내 UI 텍스트를 검토하는 플러그인입니다.

## 기능

- Figma에서 텍스트 레이어를 선택하면 AI(GPT-4o-mini)가 UX writing 가이드라인 위반 여부를 검토
- 교정 제안을 한 번의 클릭으로 적용/되돌리기/무시 가능
- Notion에 관리되는 가이드라인을 실시간 동기화 가능

## 구조

```
src/
  plugin/code.ts          # Figma 샌드박스 (텍스트 추출/교체)
  ui/                     # React + Tailwind UI
    services/openai.ts    # OpenAI API 호출 (Worker 프록시 경유)
    services/reviewer.ts  # 검토 프롬프트 구성
    services/notion.ts    # 가이드라인 동기화
  shared/types.ts         # 공유 타입

worker/                   # API 프록시 (Vercel Serverless)
  api/blocks.js           # Notion 페이지 블록 조회
  api/databases.js        # Notion DB 쿼리
  api/review.js           # OpenAI 프록시

scripts/
  sync-notion.mjs         # 가이드라인 빌드타임 동기화 (Worker 경유)
```

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 가이드라인 동기화

Notion에서 최신 가이드라인을 가져와 `src/ui/data/guidelines.json`에 저장합니다.

```bash
npm run sync
```

### 3. 빌드

```bash
npm run build
```

`dist/` 폴더에 `code.js`, `ui.html`, `manifest.json`이 생성됩니다.

### 4. Figma에서 로드

1. Figma > Plugins > Development > Import plugin from manifest...
2. `dist/manifest.json` 선택

## Worker

Figma 플러그인은 외부 API를 직접 호출할 수 없어서 (CORS), Vercel에 프록시 서버를 배포합니다. Notion API와 OpenAI API 호출을 모두 서버에서 처리하며, API key는 Vercel 환경변수로 관리됩니다.

- 배포 위치: Vercel `codeit-com` 팀
- 프로젝트: `figma-ux-writing-plugin-worker`

### Worker 재배포

```bash
cd worker
npx vercel --prod
```

## 환경 설정

| 항목 | 위치 | 설명 |
|---|---|---|
| Notion Page ID | `scripts/sync-notion.mjs` | 가이드라인 페이지 |
| Notion DB ID | `scripts/sync-notion.mjs` | 규칙 데이터베이스 |
