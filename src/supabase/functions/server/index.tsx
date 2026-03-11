import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// 🚀 서버 시작 시 rooms 테이블 자동 생성은 비활성화
// 사용자가 수동으로 생성하거나 API를 통해 생성해야 합니다.

// Health check endpoint
app.get("/make-server-4d90a2a9/health", (c) => {
  return c.json({ status: "ok" });
});

// 객실정보 테이블 자동 생성 API
app.post("/make-server-4d90a2a9/setup-rooms-table", async (c) => {
  try {
    console.log('🚀 rooms 테이블 생성 시작...');
    
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return c.json({
        success: false,
        error: 'Database URL not found. Environment variable SUPABASE_DB_URL is missing.',
        hint: 'Supabase Dashboard → SQL Editor에서 수동으로 실행해주세요.'
      }, 500);
    }

    // 완전 삭제 후 재생성 SQL
    const setupSQL = `
      -- 1️⃣ 기존 정책 완전 삭제
      DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
      DROP POLICY IF EXISTS "Authenticated users can manage rooms" ON rooms;

      -- 2️⃣ 기존 테이블 완전 삭제 (CASCADE로 관련된 모든 객체 삭제)
      DROP TABLE IF EXISTS rooms CASCADE;

      -- 3️⃣ 새 테이블 생성 (정확한 컬럼명으로)
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

      -- 4️⃣ 인덱스 생성
      CREATE INDEX idx_rooms_차수_호수 ON rooms(차수, 호수);
      CREATE INDEX idx_rooms_숙박형태 ON rooms(숙박형태);

      -- 5️⃣ RLS 정책 설정
      ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Anyone can read rooms" ON rooms
        FOR SELECT USING (true);

      CREATE POLICY "Authenticated users can manage rooms" ON rooms
        FOR ALL USING (true);
    `;

    // Deno Postgres 클라이언트 사용
    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
    const client = new Client(dbUrl);
    await client.connect();
    
    console.log('✅ 데이터베이스 연결 성공');
    
    // SQL 실행
    await client.queryArray(setupSQL);
    console.log('✅ rooms 테이블 생성 완료');
    
    // 생성된 컬럼 확인
    const result = await client.queryObject(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rooms' 
      ORDER BY ordinal_position;
    `);
    console.log('📋 생성된 컬럼:', result.rows);
    
    await client.end();
    console.log('🎉 rooms 테이블 생성 완료!');

    return c.json({ 
      success: true, 
      message: 'rooms 테이블이 성공적으로 생성되었습니다!',
      columns: result.rows
    });

  } catch (error: any) {
    console.error('❌ 테이블 생성 실패:', error);
    console.error('오류 상세:', error.message, error.code);
    
    return c.json({
      success: false,
      error: `테이블 생성 실패: ${error.message}`,
      code: error.code,
      hint: '아래 단계로 수동 생성해주세요:\n1. /FIX_ROOMS_TABLE.sql 파일 열기\n2. SQL 전체 복사\n3. Supabase Dashboard → SQL Editor에서 실행',
      sql: `-- Supabase Dashboard → SQL Editor에서 실행하세요
DROP POLICY IF EXISTS "Anyone can read rooms" ON rooms;
DROP POLICY IF EXISTS "Authenticated users can manage rooms" ON rooms;
DROP TABLE IF EXISTS rooms CASCADE;

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

CREATE INDEX idx_rooms_차수_호수 ON rooms(차수, 호수);
CREATE INDEX idx_rooms_숙박형태 ON rooms(숙박형태);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage rooms" ON rooms FOR ALL USING (true);`
    }, 500);
  }
});

// complaints 테이블 컬럼 추가 마이그레이션 API
app.post("/make-server-4d90a2a9/migrate-complaints", async (c) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      return c.json({ 
        success: false, 
        error: 'Supabase credentials not found' 
      }, 500);
    }

    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return c.json({
        success: false,
        error: 'Database URL not found',
        hint: 'Supabase Dashboard → SQL Editor에서 수동으로 실행해주세요.'
      }, 500);
    }

    // 마이그레이션 SQL
    const migrationSQL = `
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

      -- 관리사무소확인 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '관리사무소확인'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 관리사무소확인 BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;

      -- 객실이동조치 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '객실이동조치'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 객실이동조치 TEXT;
        END IF;
      END $$;

      -- 객실정비조치 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '객실정비조치'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 객실정비조치 TEXT;
        END IF;
      END $$;

      -- 담당자확인_M01 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '담당자확인_M01'
        ) THEN
          ALTER TABLE complaints ADD COLUMN "담당자확인_M01" BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;

      -- 담당자확인_M02 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '담당자확인_M02'
        ) THEN
          ALTER TABLE complaints ADD COLUMN "담당자확인_M02" BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;

      -- 담당자확인_M03 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '담당자확인_M03'
        ) THEN
          ALTER TABLE complaints ADD COLUMN "담당자확인_M03" BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;

      -- 청소상태 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '청소상태'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 청소상태 TEXT;
        END IF;
      END $$;

      -- 숙박형태 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '숙박형태'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 숙박형태 TEXT;
        END IF;
      END $$;

      -- 퇴실점검일 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '퇴실점검일'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 퇴실점검일 TEXT;
        END IF;
      END $$;

      -- 점검자 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '점검자'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 점검자 TEXT;
        END IF;
      END $$;

      -- 체크리스트데이터 컬럼 추가 (이미 있으면 무시) - JSON 형태로 저장
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '체크리스트데이터'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 체크리스트데이터 TEXT;
        END IF;
      END $$;

      -- 이상없음건수 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '이상없음건수'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 이상없음건수 INTEGER DEFAULT 0;
        END IF;
      END $$;

      -- 조치필요건수 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '조치필요건수'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 조치필요건수 INTEGER DEFAULT 0;
        END IF;
      END $$;

      -- 입주시특이사항 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '입주시특이사항'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 입주시특이사항 TEXT;
        END IF;
      END $$;

      -- 계약기간특이사항 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '계약기간특이사항'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 계약기간특이사항 TEXT;
        END IF;
      END $$;

      -- 퇴거시특이사항 컬럼 추가 (이미 있으면 무시)
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'complaints' 
          AND column_name = '퇴거시특이사항'
        ) THEN
          ALTER TABLE complaints ADD COLUMN 퇴거시특이사항 TEXT;
        END IF;
      END $$;
    `;

    // Deno Postgres 클라이언트 사용
    try {
      const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
      const client = new Client(dbUrl);
      await client.connect();
      
      await client.queryArray(migrationSQL);
      
      await client.end();

      return c.json({ 
        success: true, 
        message: 'complaints 테이블에 퇴실상태, 이사일, 관리사무소확인, 객실이동조치, 객실정비조치, 담당자확인_M01, 담당자확인_M02, 담당자확인_M03, 청소상태, 숙박형태, 퇴실점검일, 점검자, 체크리스트데이터, 이상없음건수, 치필요건수, 입주시특이사항, 계약기간특이사항, 퇴거시특이사항 컬럼이 성공적으로 추가되었습니다!' 
      });
    } catch (pgError: any) {
      console.error('Postgres 마이그레이션 오류:', pgError);
      return c.json({
        success: false,
        error: `마이그레이션 실패: ${pgError.message}`,
        sql: migrationSQL,
        hint: 'Supabase Dashboard → SQL Editor에서 수동으로 실행해주세요.'
      }, 500);
    }

  } catch (error: any) {
    console.error('마이그레이션 중 오류:', error);
    return c.json({ 
      success: false, 
      error: error.message,
      hint: 'Supabase Dashboard → SQL Editor에서 수동으로 실행해주세요.'
    }, 500);
  }
});

// 🗑️ 모든 데이터 초기화 API (테스트용)
app.post("/make-server-4d90a2a9/reset-all-data", async (c) => {
  try {
    console.log('🗑️ 모든 데이터 초기화 시작...');
    
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    let deletedKvCount = 0;
    let deletedComplaintsCount = 0;
    let deletedRoomsCount = 0;
    
    // 1. Supabase 테이블 데이터 삭제 (KV Store보다 먼저)
    if (dbUrl) {
      try {
        const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
        const client = new Client(dbUrl);
        await client.connect();
        
        // complaints 테이블 데이터 삭제 및 카운트
        const complaintsResult = await client.queryObject('SELECT COUNT(*) as count FROM complaints;');
        deletedComplaintsCount = Number(complaintsResult.rows[0]?.count || 0);
        await client.queryArray('TRUNCATE TABLE complaints RESTART IDENTITY CASCADE;');
        console.log(`✅ complaints 테이블 데이터 삭제 완료: ${deletedComplaintsCount}개`);
        
        // rooms 테이블 데이터 삭제 및 카운트
        const roomsResult = await client.queryObject('SELECT COUNT(*) as count FROM rooms;');
        deletedRoomsCount = Number(roomsResult.rows[0]?.count || 0);
        await client.queryArray('TRUNCATE TABLE rooms RESTART IDENTITY CASCADE;');
        console.log(`✅ rooms 테이블 데이터 삭제 완료: ${deletedRoomsCount}개`);
        
        await client.end();
      } catch (dbError: any) {
        console.warn('⚠️ 테이블 삭제 중 오류:', dbError.message);
      }
    }
    
    // 2. KV Store의 모든 키 가져오기 및 삭제
    const allKeys = await kv.getByPrefix('');
    deletedKvCount = allKeys.length;
    console.log(`📋 KV Store 삭제할 데이터 개수: ${deletedKvCount}개`);
    
    if (allKeys.length > 0) {
      const keys = allKeys.map(item => item.key);
      await kv.mdel(keys);
      console.log('✅ KV Store 데이터 삭제 완료');
    }
    
    console.log('🎉 모든 데이터 초기화 완료!');
    
    return c.json({ 
      success: true, 
      message: '모든 데이터가 성공적으로 초기화되었습니다!',
      deletedCount: deletedKvCount + deletedComplaintsCount + deletedRoomsCount,
      details: {
        kvStore: deletedKvCount,
        complaints: deletedComplaintsCount,
        rooms: deletedRoomsCount
      }
    });
    
  } catch (error: any) {
    console.error('❌ 데이터 초기화 실패:', error);
    return c.json({
      success: false,
      error: `데이터 초기화 실패: ${error.message}`
    }, 500);
  }
});

Deno.serve(app.fetch);