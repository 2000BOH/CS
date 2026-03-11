-- ========================================
-- BLUECARE rooms 테이블 완전 재생성
-- ========================================
-- 이 SQL을 Supabase Dashboard → SQL Editor에서 실행하세요!
-- 실행 시간: 약 5초

-- 🚨 1️⃣ 기존 정책 완전 삭제
DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can manage rooms" ON rooms;

-- 🚨 2️⃣ 기존 테이블 완전 삭제 (CASCADE로 관련된 모든 객체 삭제)
DROP TABLE IF EXISTS rooms CASCADE;

-- 🚨 3️⃣ 혹시 남아있을 수 있는 타입 삭제
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rooms') THEN
        DROP TYPE IF EXISTS rooms CASCADE;
    END IF;
END $$;

-- ✅ 4️⃣ 새 테이블 생성 (정확한 컬럼명으로)
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

-- ✅ 5️⃣ 인덱스 생성
CREATE INDEX idx_rooms_차수_호수 ON rooms(차수, 호수);
CREATE INDEX idx_rooms_숙박형태 ON rooms(숙박형태);

-- ✅ 6️⃣ RLS 정책 설정
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms" ON rooms
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage rooms" ON rooms
    FOR ALL USING (true);

-- ✅ 완료! 
SELECT 
    'rooms 테이블 생성 완료!' as status,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'rooms';

-- 📋 생성된 컬럼 목록 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rooms' 
ORDER BY ordinal_position;
