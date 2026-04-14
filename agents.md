# 먹콤보 (MukCombo) — Agent Instructions

## 프로젝트 개요
목포 대학교 앞 맛집 정보 앱. 메뉴 검색, 피드, 가게 목록, AI 추천 챗봇, 사장님/관리자 대시보드 포함.

## 기술 스택
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **DB / Auth**: Supabase (PostgreSQL + Auth JWT)
- **Styling**: Inline styles (CSS-in-JS 없음, Tailwind 없음)
- **Deploy**: Vercel (main 브랜치 push → 자동 배포)

## 주요 구조
```
src/
  app/
    page.tsx           # 메인 탭 컨테이너 (search/feed/stores/manage)
    api/               # Next.js Route Handlers
      food-categories/ # 음식 카테고리 목록
      menu-items/      # 카테고리 기반 가게+메뉴 조회
      menu-search/     # 키워드 메뉴 검색 (JS 필터링)
      posts/           # 피드 게시물
      stores/          # 가게 CRUD + [id] 단건 조회
  components/
    ChatBot.tsx        # AI 추천 챗봇 (food_categories 기반)
    FoodSearch.tsx     # 먹검색 탭 (챗봇 + 직접 검색)
    DashboardTab.tsx   # 관리 탭 (로그인 + 사장/관리자 UI)
  lib/
    supabase.ts        # Supabase 클라이언트
  types/
    index.ts           # Post, Store 등 공통 타입
```

## 주요 규칙

### 코딩 스타일
- 인라인 스타일만 사용 (`style={{ ... }}`), 클래스명 없음
- 색상 팔레트: 배경 `#0a0a0a`, 포인트 `#c8a96e`, 텍스트 `#e0dcd4`
- 폰트: `'Noto Sans KR', sans-serif` (변수 `F`로 공통 적용)
- 새 파일 생성 최소화 — 기존 파일 수정 우선

### DB 패턴
- Supabase JSONB 컬럼 (`menu_names`, `prices`, `categories`)은 DB 레벨 필터 사용 금지 → JS에서 필터링
- `is_premium` 가게는 항상 정렬 우선순위 최상단

### 인증
- `ADMIN_EMAILS` env var로 관리자 판단
- OAuth 콜백은 `/?tab=manage`로 리다이렉트

## 배포 프로세스
1. 코드 수정 → TypeScript 체크 (`npx tsc --noEmit`)
2. `git add` → `git commit` → `git push origin main`
3. Vercel이 자동 배포 실행
4. **배포 push 완료 시 Notion 자동 업데이트** (PostToolUse 훅으로 자동 실행)
   - Notion 페이지: 먹콤보(MukCombo) 개발 작업 정리
   - 커밋 해시 + 커밋 메시지 + 날짜 기록

## Notion 참조
- 개발 작업 정리 페이지 ID: `33b44e03-a878-8102-8a86-c61a2105841f`
- 배포 로그는 해당 페이지에 `🚀 배포 — YYYY-MM-DD` 헤딩으로 자동 추가됨
