# 🚨 BLUECARE rooms 테이블 생성 가이드

## 문제 상황
`PGRST204` 오류: rooms 테이블의 컬럼이 데이터베이스에 없습니다.

## ✅ 해결 방법 (5분 완료)

### 1️⃣ SQL 파일 열기
프로젝트 파일 목록에서 **`/FIX_ROOMS_TABLE.sql`** 파일을 클릭하여 엽니다.

### 2️⃣ SQL 전체 복사
파일 내용을 **전체 선택** (Ctrl+A 또는 Cmd+A) 후 **복사** (Ctrl+C 또는 Cmd+C)

### 3️⃣ Supabase Dashboard 접속
1. 브라우저 새 탭에서 https://supabase.com/dashboard 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 4️⃣ SQL 붙여넣기 및 실행
1. SQL Editor에서 **붙여넣기** (Ctrl+V 또는 Cmd+V)
2. 오른쪽 아래 **RUN** 버튼 클릭
3. "Success" 메시지 확인

### 5️⃣ 완료!
1. BLUECARE 페이지로 돌아오기
2. **페이지 새로고침** (F5 키)
3. "객실정보" 탭에서 데이터 업로드
4. "데이터베이스에 저장" 버튼 클릭

---

## 📋 생성되는 테이블 구조

```sql
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
```

## ⚠️ 중요 안내
- 이 작업은 **최초 1회만** 필요합니다
- SQL 실행 후 기존 rooms 데이터는 모두 삭제됩니다
- 실행 시간은 약 5초입니다
- SQL 실행 후 **반드시 페이지를 새로고침**하세요!

## 🎯 엑셀 데이터 형식
```
차수 | 호수 | 타입 | 조망 | 운영종료일 | 숙박형태 | 임차인 | 임차인연락처
1    | 101  | A    | 바다 | 2026.12.31 | 인스파이어 | 홍길동 | 010-1234-5678
```

## 🆘 도움이 필요하신가요?
SQL 실행 중 오류가 발생하면 오류 메시지의 스크린샷을 공유해주세요.
