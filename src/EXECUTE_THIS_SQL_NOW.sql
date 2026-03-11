-- ⚠️⚠️⚠️ BLUECARE 데이터베이스 설정 - 입주민 변경 이력 관리 추가 ⚠️⚠️⚠️
-- 
-- ============================================================
-- 📋 실행 순서 (반드시 순서대로 따라하세요!)
-- ============================================================
-- 
-- 1️⃣ 이 파일 전체를 복사하세요
--    - 키보드: Ctrl + A (전체 선택) → Ctrl + C (복사)
--    - 또는: 마우스로 전체 드래그 후 복사
-- 
-- 2️⃣ Supabase 사이트에 로그인하세요
--    - 브라우저에서 https://supabase.com 접속
--    - 로그인 후 프로젝트 선택
-- 
-- 3️⃣ SQL Editor 메뉴로 이동하세요
--    - 왼쪽 메뉴에서 "SQL Editor" 클릭
--    - 또는 단축키: 왼쪽 메뉴 아이콘에서 데이터베이스 모양 찾기
-- 
-- 4️⃣ 새 쿼리를 만드세요
--    - "+ New query" 버튼 클릭
--    - 빈 SQL 에디터 화면이 나타남
-- 
-- 5️⃣ 복사한 내용을 붙여넣으세요
--    - 에디터 화면에 커서를 놓고
--    - 키보드: Ctrl + V (붙여넣기)
-- 
-- 6️⃣ RUN 버튼을 클릭하세요
--    - 화면 오른쪽 아래 "RUN" 버튼 클릭
--    - 또는 단축키: Ctrl + Enter
-- 
-- 7️⃣ 성공 메시지를 확인하세요
--    - "Success. No rows returned" 메시지가 보이면 성공!
--    - 아래쪽에 테이블 컬럼 목록이 표시됨
-- 
-- 8️⃣ BLUECARE 앱으로 돌아가세요
--    - 이제 객실정보 업로드 시 이전 입주민 정보가 자동으로 저장됩니다!
-- 
-- ============================================================
-- ⚠️ 주의사항
-- ============================================================
-- - 이 SQL을 실행하면 기존 rooms 테이블이 삭제되고 다시 만들어집니다
-- - 기존 객실정보 데이터는 유지되지 않으므로 다시 업로드해야 합니다
-- - 실행은 1번만 하면 됩니다
-- ============================================================

-- 1️⃣ 기존 테이블 완전 삭제 (정책, 인덱스 모두 삭제)
DROP TABLE IF EXISTS rooms CASCADE;

-- 2️⃣ 올바른 컬럼명으로 테이블 재생성
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
    이전임차인 TEXT, -- 이전 입주민 이름
    이전임차인연락처 TEXT, -- 이전 입주민 연락처
    변경일시 TIMESTAMPTZ, -- 입주민 정보 변경 일시
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(차수, 호수)
);

-- 3️⃣ 인덱스 생성 (검색 성능 향상)
CREATE INDEX idx_rooms_차수_호수 ON rooms(차수, 호수);
CREATE INDEX idx_rooms_숙박형태 ON rooms(숙박형태);

-- 4️⃣ RLS (Row Level Security) 활성화
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 5️⃣ 모든 사용자가 읽기 가능하도록 정책 설정
CREATE POLICY "Anyone can read rooms" ON rooms
    FOR SELECT USING (true);

-- 6️⃣ 인증된 사용자는 모든 작업 가능하도록 정책 설정
CREATE POLICY "Authenticated users can manage rooms" ON rooms
    FOR ALL USING (true);

-- ✅ 완료 확인
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'rooms' 
ORDER BY ordinal_position;

-- 위 쿼리 결과에 다음 컬럼들이 보여야 합니다:
-- id, 차수, 호수, 타입, 조망, 운영종료일, 숙박형태, 임차인, 임차인연락처, 이전임차인, 이전임차인연락처, 변경일시, created_at, updated_at