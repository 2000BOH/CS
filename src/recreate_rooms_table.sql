-- BLUECARE rooms 테이블 재생성 스크립트
-- Supabase Dashboard → SQL Editor에서 실행하세요

-- 1. 기존 테이블 삭제 (데이터도 함께 삭제됨 - 주의!)
DROP TABLE IF EXISTS rooms CASCADE;

-- 2. 새로운 테이블 생성 (올바른 컬럼명으로)
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

-- 3. 인덱스 생성 (검색 성능 향상)
CREATE INDEX idx_rooms_차수_호수 ON rooms(차수, 호수);
CREATE INDEX idx_rooms_숙박형태 ON rooms(숙박형태);

-- 완료 메시지
SELECT 'rooms 테이블이 재생성되었습니다!' as message;
SELECT '이제 RoomDataManager에서 데이터를 업로드하세요.' as next_step;
