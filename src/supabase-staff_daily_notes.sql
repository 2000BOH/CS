-- 동훈·시우·현석 일일 메모 테이블 (관리자 페이지에서 조회)
-- Supabase 대시보드 → SQL Editor에서 이 스크립트를 실행하세요.

CREATE TABLE IF NOT EXISTS public.staff_daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id text NOT NULL,
  note_date date NOT NULL,
  "중요사항" text DEFAULT '',
  "특이사항" text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, note_date)
);

-- RLS 활성화 후 정책 추가 (complaints와 동일: 로그인한 사용자만 접근)
ALTER TABLE public.staff_daily_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_staff_notes" ON public.staff_daily_notes;
CREATE POLICY "authenticated_all_staff_notes"
  ON public.staff_daily_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 인덱스 (선택)
CREATE INDEX IF NOT EXISTS idx_staff_daily_notes_date ON public.staff_daily_notes(note_date);
CREATE INDEX IF NOT EXISTS idx_staff_daily_notes_staff ON public.staff_daily_notes(staff_id);
