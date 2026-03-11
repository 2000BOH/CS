-- BLUECARE 객실정보 테이블 생성
-- Supabase Dashboard → SQL Editor에서 실행하세요

-- 테이블 생성 (NOTICE 없이 조용하게)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'rooms'
  ) THEN
    CREATE TABLE rooms (
      id SERIAL PRIMARY KEY,
      차수 TEXT NOT NULL,
      호수 TEXT NOT NULL,
      타입 TEXT,
      조망 TEXT,
      운영종료일 TEXT,
      숙박형태 TEXT,
      임차인 TEXT,
      임차인연락처 TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(차수, 호수)
    );
  END IF;
END $$;

-- 인덱스 생성 (검색 속도 향상)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_rooms_차수'
  ) THEN
    CREATE INDEX idx_rooms_차수 ON rooms(차수);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_rooms_호수'
  ) THEN
    CREATE INDEX idx_rooms_호수 ON rooms(호수);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_rooms_차수_호수'
  ) THEN
    CREATE INDEX idx_rooms_차수_호수 ON rooms(차수, 호수);
  END IF;
END $$;

-- RLS(Row Level Security) 활성화
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있으면 삭제 (조용하게)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' AND policyname = 'Anyone can read rooms'
  ) THEN
    DROP POLICY "Anyone can read rooms" ON rooms;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' AND policyname = 'Authenticated users can insert rooms'
  ) THEN
    DROP POLICY "Authenticated users can insert rooms" ON rooms;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' AND policyname = 'Authenticated users can update rooms'
  ) THEN
    DROP POLICY "Authenticated users can update rooms" ON rooms;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' AND policyname = 'Authenticated users can delete rooms'
  ) THEN
    DROP POLICY "Authenticated users can delete rooms" ON rooms;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rooms' AND policyname = 'Authenticated users can manage rooms'
  ) THEN
    DROP POLICY "Authenticated users can manage rooms" ON rooms;
  END IF;
END $$;

-- 모든 사용자가 읽을 수 있도록 설정
CREATE POLICY "Anyone can read rooms" ON rooms
  FOR SELECT USING (true);

-- 모든 작업 가능 (추가/수정/삭제)
CREATE POLICY "Authenticated users can manage rooms" ON rooms
  FOR ALL USING (true);

-- 완료 메시지
SELECT 'rooms 테이블이 성공적으로 생성되었습니다!' as message;