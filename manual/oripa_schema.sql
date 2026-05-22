-- ================================================================
-- 오리파(뽑기) 시스템 Supabase SQL
-- Supabase Dashboard > SQL Editor 에서 실행
-- ================================================================

-- 1. 유저 토큰 잔액
create table if not exists user_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- 2. 토큰 구매 내역
create table if not exists token_purchases (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  token_amount     integer not null,
  price_krw        integer not null,
  toss_payment_key text,
  toss_order_id    text unique not null,
  status           text not null default 'pending' check (status in ('pending','confirmed','failed')),
  created_at       timestamptz not null default now()
);

-- 3. 오리파 이벤트
create table if not exists oripa_events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  start_date   timestamptz not null,
  end_date     timestamptz not null,
  total_slots  integer not null default 100 check (total_slots > 0),
  seed_hash    text not null,       -- SHA-256(seed) 사전 공개
  seed         text,                -- 이벤트 종료 후 공개
  is_active    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 4. 오리파 상품 (1등~3등, 추가 가능)
create table if not exists oripa_prizes (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references oripa_events(id) on delete cascade not null,
  rank        integer not null check (rank > 0),
  name        text not null,
  description text,
  images      jsonb not null default '[]',   -- 최대 5장 URL 배열
  quantity    integer not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now()
);

-- 5. 오리파 슬롯 (이벤트 생성 시 사전 할당)
-- position은 시드 기반으로 셔플된 인덱스
create table if not exists oripa_slots (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid references oripa_events(id) on delete cascade not null,
  position     integer not null,              -- 0-based 슬롯 번호
  prize_id     uuid references oripa_prizes(id),  -- null = 꽝
  is_drawn     boolean not null default false,
  drawn_by     uuid references auth.users(id),
  drawn_at     timestamptz,
  unique(event_id, position)
);

-- 6. 뽑기 결과 로그 (투명성용)
create table if not exists oripa_draws (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid references oripa_events(id) not null,
  user_id      uuid references auth.users(id) not null,
  slot_id      uuid references oripa_slots(id) not null,
  prize_id     uuid references oripa_prizes(id),   -- null = 꽝
  drawn_at     timestamptz not null default now()
);

-- ── 인덱스 ──────────────────────────────────────────────────
create index if not exists idx_user_tokens_user on user_tokens(user_id);
create index if not exists idx_token_purchases_user on token_purchases(user_id);
create index if not exists idx_oripa_slots_event on oripa_slots(event_id);
create index if not exists idx_oripa_slots_undrawn on oripa_slots(event_id, is_drawn) where not is_drawn;
create index if not exists idx_oripa_draws_event on oripa_draws(event_id);
create index if not exists idx_oripa_draws_user on oripa_draws(user_id);
create index if not exists idx_oripa_prizes_event on oripa_prizes(event_id, rank);

-- ── RLS (Row Level Security) ─────────────────────────────────
alter table user_tokens enable row level security;
alter table token_purchases enable row level security;
alter table oripa_events enable row level security;
alter table oripa_prizes enable row level security;
alter table oripa_slots enable row level security;
alter table oripa_draws enable row level security;

-- user_tokens: 본인만 조회
create policy "user_tokens_select" on user_tokens for select using (auth.uid() = user_id);
create policy "user_tokens_insert" on user_tokens for insert with check (auth.uid() = user_id);
-- update는 서버(service role)만 허용 → anon/authenticated 정책 없음

-- token_purchases: 본인 조회
create policy "purchases_select" on token_purchases for select using (auth.uid() = user_id);
create policy "purchases_insert" on token_purchases for insert with check (auth.uid() = user_id);

-- oripa_events: 누구나 조회, 관리는 service role
create policy "events_select" on oripa_events for select using (true);

-- oripa_prizes: 누구나 조회
create policy "prizes_select" on oripa_prizes for select using (true);

-- oripa_slots: 뽑힌 슬롯만 공개 (prize_id 포함), 미뽑힌 건 prize_id null로 노출
create policy "slots_select" on oripa_slots for select using (true);

-- oripa_draws: 누구나 조회 (투명성)
create policy "draws_select" on oripa_draws for select using (true);
-- 본인 기록
create policy "draws_user_select" on oripa_draws for select using (auth.uid() = user_id);

-- ================================================================
-- Supabase Storage 버킷: oripa-images (서비스 대시보드에서 생성 필요)
-- Public bucket 으로 생성 후 아래 정책 적용
-- ================================================================
-- insert policy: authenticated 사용자만 업로드 허용
-- select policy: 공개 (public)
