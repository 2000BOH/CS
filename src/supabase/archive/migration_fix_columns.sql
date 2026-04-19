-- BLUECARE 컬럼명 수정 마이그레이션
-- Supabase Dashboard → SQL Editor에서 실행하세요

-- 1. 연락처 → 임차인연락처로 변경 (있으면)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = '연락처'
  ) THEN
    ALTER TABLE rooms RENAME COLUMN 연락처 TO 임차인연락처;
    RAISE NOTICE '연락처 → 임차인연락처 변경 완료';
  ELSE
    RAISE NOTICE '연락처 컬럼이 없거나 이미 변경됨';
  END IF;
END $$;

-- 2. 임차일 → 임차인으로 변경
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = '임차일'
  ) THEN
    ALTER TABLE rooms RENAME COLUMN 임차일 TO 임차인;
    RAISE NOTICE '임차일 → 임차인 변경 완료';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = '입차일'
  ) THEN
    ALTER TABLE rooms RENAME COLUMN 입차일 TO 임차인;
    RAISE NOTICE '입차일 → 임차인 변경 완료';
  ELSE
    RAISE NOTICE '임차일/입차일 컬럼이 없거나 이미 변경됨';
  END IF;
END $$;

-- 3. 조항 → 조망으로 변경 (있으면)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = '조항'
  ) THEN
    ALTER TABLE rooms RENAME COLUMN 조항 TO 조망;
    RAISE NOTICE '조항 → 조망 변경 완료';
  ELSE
    RAISE NOTICE '조항 컬럼이 없거나 이미 변경됨';
  END IF;
END $$;

-- 완료 메시지
SELECT 'rooms 테이블 컬럼명 수정이 완료되었습니다!' as message;
