-- BLUECARE 민원 테이블 컬럼 추가 마이그레이션
-- Supabase Dashboard → SQL Editor에서 실행하세요

-- 퇴실상태 컬럼 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'complaints' 
    AND column_name = '퇴실상태'
  ) THEN
    ALTER TABLE complaints ADD COLUMN 퇴실상태 TEXT;
  END IF;
END $$;

-- 이사일 컬럼 추가 (이미 있으면 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'complaints' 
    AND column_name = '이사일'
  ) THEN
    ALTER TABLE complaints ADD COLUMN 이사일 TEXT;
  END IF;
END $$;

-- 완료 메시지
SELECT 'complaints 테이블에 퇴실상태, 이사일 컬럼이 성공적으로 추가되었습니다!' as message;
