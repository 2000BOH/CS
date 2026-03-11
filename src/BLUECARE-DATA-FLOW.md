# 🔄 BLUECARE 데이터 흐름 완전 분석

## 📋 목차
1. [입력 페이지: 구분 & 처리상태 선택 시 데이터 흐름](#1-입력-페이지-구분--처리상태-선택-시-데이터-흐름)
2. [전체 시스템 아키텍처](#2-전체-시스템-아키텍처)
3. [데이터베이스 구조](#3-데이터베이스-구조)
4. [모든 API 엔드포인트](#4-모든-api-엔드포인트)
5. [페이지별 데이터 흐름](#5-페이지별-데이터-흐름)
6. [상태 관리 로직](#6-상태-관리-로직)

---

## 1. 입력 페이지: 구분 & 처리상태 선택 시 데이터 흐름

### 🎯 질문: "구분"과 "처리상태"를 선택했을 때 데이터는 어디로 가나요?

### ✅ 답변: 완벽한 데이터 흐름 경로

```
사용자 입력
    ↓
ComplaintForm.tsx (UI 컴포넌트)
    ↓
formData 상태 업데이트
    ↓
[제출 버튼 클릭]
    ↓
handleSubmit() 함수 실행
    ↓
onSubmit() 호출 (props)
    ↓
InputPage.tsx의 onSubmit
    ↓
App.tsx의 addComplaint() 함수
    ↓
┌─────────────────────────────────────┐
│ 1. 새 Complaint 객체 생성           │
│    - id: 타임스탬프 기반 생성       │
│    - 등록일시: ISO 형식            │
│    - 등록자: currentUserId         │
│    - 구분: 사용자가 선택한 값      │
│    - 상태: 사용자가 선택한 값      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Supabase 데이터베이스에 저장     │
│    - supabase.from('complaints')   │
│      .insert([newComplaint])       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. 로컬 상태 업데이트               │
│    - setComplaints([new, ...old])  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. 모든 페이지에 실시간 반영        │
│    - 전체조회 페이지                │
│    - 영선 페이지                    │
│    - 객실이동 페이지                │
│    - 객실체크 페이지                │
│    - 객실정비 페이지                │
│    - M01/M02/M03 페이지            │
└─────────────────────────────────────┘
```

---

## 2. 전체 시스템 아키텍처

### 🏗️ 3-Tier Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  App.tsx (메인 상태 관리)                          │ │
│  │  - complaints: Complaint[]                         │ │
│  │  - rooms: RoomInfo[]                               │ │
│  │  - currentUserId: string                           │ │
│  │  - currentPage: string                             │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Pages (페이지 컴포넌트)                           │ │
│  │  - InputPage.tsx (입력)                            │ │
│  │  - AllComplaintsPage.tsx (전체조회)                │ │
│  │  - MaintenancePage.tsx (영선)                      │ │
│  │  - RoomMovePage.tsx (객실이동)                     │ │
│  │  - RoomCheckPage.tsx (객실체크)                    │ │
│  │  - CleaningPage.tsx (객실정비)                     │ │
│  │  - InfoPage.tsx (안내/입력)                        │ │
│  │  - M01Page.tsx (인스파이어)                        │ │
│  │  - M02Page.tsx (장박)                              │ │
│  │  - M03Page.tsx (객실정비)                          │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                            ↕
                    HTTP Requests
                    (fetch API)
                            ↕
┌──────────────────────────────────────────────────────────┐
│              SERVER (Supabase Edge Function)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Hono Web Server (index.tsx)                       │ │
│  │  - CORS 설정                                        │ │
│  │  - Logger 미들웨어                                  │ │
│  │  - API 라우트 핸들러                                │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  KV Store 유틸리티 (kv_store.tsx)                 │ │
│  │  - get, set, del, mget, mset, mdel, getByPrefix   │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                            ↕
                      SQL Queries
                            ↕
┌──────────────────────────────────────────────────────────┐
│            DATABASE (Supabase PostgreSQL)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  complaints 테이블 (민원 데이터)                  │ │
│  │  - id, 차수, 호실, 구분, 내용, 조치사항 ...       │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  rooms 테이블 (객실 정보)                         │ │
│  │  - 차수, 호수, 타입, 숙박형태, 임차인 ...         │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  kv_store_4d90a2a9 테이블 (키-값 저장소)         │ │
│  │  - key, value, created_at, updated_at             │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 구조

### 📊 complaints 테이블 (민원 데이터)

| 컬럼명 | 타입 | 설명 | 입력 페이지 연관 |
|--------|------|------|------------------|
| **id** | TEXT | 민원 고유 ID | ✅ 자동 생성 (타임스탬프) |
| **차수** | TEXT | 건물 차수 (1, 2, 3, 4) | ✅ 사용자 입력 |
| **호실** | TEXT | 객실 번호 | ✅ 사용자 입력 |
| **구분** | TEXT | 민원 구분 | ✅ **사용자 선택** (민원(CS), 민원(영선), 입실, 퇴실, 청소) |
| **타입** | TEXT | 객실 타입 | 🔄 rooms 테이블에서 자동 매칭 |
| **내용** | TEXT | 민원 내용 | ✅ 사용자 입력 |
| **조치사항** | TEXT | 조치 사항 | ✅ 사용자 입력 |
| **객실이동조치** | TEXT | 객실이동 페이지 조치사항 | ❌ 입력 페이지 외 사용 |
| **객실정비조치** | TEXT | 객실정비 페이지 조치사항 | ❌ 입력 페이지 외 사용 |
| **관리사무소확인** | BOOLEAN | 객실이동 관리사무소 확인 | ❌ 입력 페이지 외 사용 |
| **상태** | TEXT | 처리 상태 | ✅ **사용자 선택** (접수, 영선팀, 진행중, 부서이관, 외부업체, 완료) |
| **등록일시** | TIMESTAMPTZ | 등록 시간 | ✅ 자동 생성 (현재 시간) |
| **완료일시** | TIMESTAMPTZ | 완료 시간 | 🔄 상태 변경 시 자동 |
| **연락일** | TEXT | 연락 날짜 | ✅ 사용자 선택 (캘린더) |
| **조치일** | TEXT | 조치 날짜 | ✅ 사용자 선택 (캘린더) |
| **처리일** | TEXT | 처리 날짜 (영선 페이지) | ❌ 입력 페이지 외 사용 |
| **등록자** | TEXT | 등록한 사용자 ID | ✅ 자동 저장 (로그인 ID) |
| **사진** | TEXT[] | 사진 URL 배열 | ✅ 사용자 업로드 |
| **우선처리** | BOOLEAN | 우선 처리 플래그 | ❌ 입력 페이지 외 사용 |
| **운영종료일** | TEXT | 객실 운영 종료일 | 🔄 rooms 테이블에서 자동 |
| **입주일** | TEXT | 입주 날짜 | 🔄 rooms 테이블에서 자동 |
| **청소예정일** | TEXT | 청소 예정일 | ❌ 입력 페이지 외 사용 |
| **청소상태** | TEXT | 청소 상태 | ❌ 입력 페이지 외 사용 |
| **퇴실상태** | TEXT | 퇴실 상태 (준비, 연락, 퇴실, 완료) | ❌ 입력 페이지 외 사용 |
| **이사일** | TEXT | 이사 날짜 | ❌ 입력 페이지 외 사용 |
| **담당자확인_M01** | BOOLEAN | M01 페이지 담당자 확인 | ❌ M01 페이지 전용 |
| **담당자확인_M02** | BOOLEAN | M02 페이지 담당자 확인 | ❌ M02 페이지 전용 |
| **담당자확인_M03** | BOOLEAN | M03 페이지 담당자 확인 | ❌ M03 페이지 전용 |
| **퇴실점검일** | TEXT | 퇴실 점검 날짜 | ❌ 객실체크 페이지 전용 |
| **점검자** | TEXT | 점검자 이름 | ❌ 객실체크 페이지 전용 |
| **체크리스트데이터** | TEXT | 체크리스트 JSON | ❌ 객실체크 페이지 전용 |
| **이상없음건수** | INTEGER | 이상없음 개수 | ❌ 객실체크 페이지 전용 |
| **조치필요건수** | INTEGER | 조치필요 개수 | ❌ 객실체크 페이지 전용 |
| **입주시특이사항** | TEXT | 입주 시 특이사항 | ❌ 객실체크 페이지 전용 |
| **계약기간특이사항** | TEXT | 계약 기간 특이사항 | ❌ 객실체크 페이지 전용 |
| **퇴거시특이사항** | TEXT | 퇴거 시 특이사항 | ❌ 객실체크 페이지 전용 |

### 📊 rooms 테이블 (객실 정보)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| **id** | SERIAL | 자동 증가 ID |
| **차수** | TEXT | 건물 차수 |
| **호수** | TEXT | 객실 번호 |
| **타입** | TEXT | 객실 타입 (A, B, C 등) |
| **조망** | TEXT | 조망 정보 |
| **운영종료일** | TEXT | 운영 종료일 |
| **숙박형태** | TEXT | 숙박 형태 (인스파이어, 장박, 객실정비) |
| **임차인** | TEXT | 현재 임차인 이름 |
| **임차인연락처** | TEXT | 임차인 연락처 |
| **이전임차인** | TEXT | 이전 임차인 이름 |
| **이전임차인연락처** | TEXT | 이전 임차인 연락처 |
| **변경일시** | TIMESTAMPTZ | 입주민 정보 변경 일시 |
| **created_at** | TIMESTAMPTZ | 생성 시간 |
| **updated_at** | TIMESTAMPTZ | 수정 시간 |

### 📊 kv_store_4d90a2a9 테이블 (키-값 저장소)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| **key** | TEXT | 키 (PRIMARY KEY) |
| **value** | TEXT | 값 (JSON 문자열) |
| **created_at** | TIMESTAMPTZ | 생성 시간 |
| **updated_at** | TIMESTAMPTZ | 수정 시간 |

---

## 4. 모든 API 엔드포인트

### 🌐 서버 API 목록 (Base URL: `/make-server-4d90a2a9`)

| 엔드포인트 | 메서드 | 설명 | 사용 위치 |
|-----------|--------|------|-----------|
| `/health` | GET | 서버 상태 체크 | 헬스 체크 |
| `/setup-rooms-table` | POST | rooms 테이블 생성 | 안내/입력 페이지 |
| `/migrate-complaints` | POST | complaints 테이블 컬럼 추가 | 안내/입력 페이지 |
| `/reset-all-data` | POST | 모든 데이터 초기화 | 안내/입력 페이지 (01번만) |

### 🔍 `/health` - 서버 상태 체크
```typescript
GET /make-server-4d90a2a9/health

Response:
{
  status: "ok"
}
```

### 🏗️ `/setup-rooms-table` - rooms 테이블 생성
```typescript
POST /make-server-4d90a2a9/setup-rooms-table

Response (성공):
{
  success: true,
  message: "rooms 테이블이 성공적으로 생성되었습니다!",
  columns: [ ... ]
}

Response (실패):
{
  success: false,
  error: "테이블 생성 실패: ...",
  hint: "Supabase Dashboard → SQL Editor에서 수동으로 실행해주세요.",
  sql: "CREATE TABLE rooms ..."
}
```

### 🔧 `/migrate-complaints` - complaints 테이블 컬럼 추가
```typescript
POST /make-server-4d90a2a9/migrate-complaints

Response (성공):
{
  success: true,
  message: "complaints 테이블에 컬럼이 성공적으로 추가되었습니다!"
}

Response (실패):
{
  success: false,
  error: "마이그레이션 실패: ...",
  hint: "Supabase Dashboard → SQL Editor에서 수동으로 실행해주세요."
}

추가되는 컬럼:
- 퇴실상태 (TEXT)
- 이사일 (TEXT)
- 관리사무소확인 (BOOLEAN)
- 객실이동조치 (TEXT)
- 객실정비조치 (TEXT)
- 담당자확인_M01 (BOOLEAN)
- 담당자확인_M02 (BOOLEAN)
- 담당자확인_M03 (BOOLEAN)
- 청소상태 (TEXT)
- 퇴실점검일 (TEXT)
- 점검자 (TEXT)
- 체크리스트데이터 (TEXT)
- 이상없음건수 (INTEGER)
- 조치필요건수 (INTEGER)
- 입주시특이사항 (TEXT)
- 계약기간특이사항 (TEXT)
- 퇴거시특이사항 (TEXT)
```

### 🗑️ `/reset-all-data` - 모든 데이터 초기화
```typescript
POST /make-server-4d90a2a9/reset-all-data

Response (성공):
{
  success: true,
  message: "모든 데이터가 성공적으로 초기화되었습니다!",
  deletedCount: 100,
  details: {
    complaints: 50,
    rooms: 30,
    kvStore: 20
  }
}

Response (실패):
{
  success: false,
  error: "데이터 초기화 실패: ..."
}

삭제되는 데이터:
- complaints 테이블의 모든 데이터 (TRUNCATE)
- rooms 테이블의 모든 데이터 (TRUNCATE)
- kv_store_4d90a2a9 테이블의 모든 데이터 (DELETE)
```

---

## 5. 페이지별 데이터 흐름

### 📝 1. 입력 페이지 (InputPage.tsx)

```
사용자 입력
    ↓
ComplaintForm.tsx
    ↓
┌─────────────────────────────────────┐
│ 입력 필드:                          │
│ - 차수 (필수)                       │
│ - 호실 (필수)                       │
│ - 구분 (필수) ← 선택 시 저장!      │
│ - 내용 (필수)                       │
│ - 조치사항                          │
│ - 상태 (기본: 접수) ← 선택 시 저장! │
│ - 연락일 (캘린더)                   │
│ - 조치일 (캘린더)                   │
│ - 사진 (최대 5장)                   │
└─────────────────────────────────────┘
    ↓
handleSubmit()
    ↓
onSubmit(complaint)
    ↓
App.tsx → addComplaint()
    ↓
┌─────────────────────────────────────┐
│ 1. 객실 정보 매칭                   │
│    - rooms 배열에서 차수+호실 검색  │
│    - 운영종료일, 입주일 자동 추가   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. 새 Complaint 객체 생성           │
│    - id: Date.now().toString()      │
│    - 등록일시: new Date().toISOString() │
│    - 등록자: currentUserId          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Supabase에 삽입                  │
│    supabase.from('complaints')      │
│      .insert([newComplaint])        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. 로컬 상태 업데이트               │
│    setComplaints([new, ...old])     │
└─────────────────────────────────────┘
    ↓
✅ 모든 페이지에 즉시 반영!
```

### 📊 2. 전체조회 페이지 (AllComplaintsPage.tsx)

```
complaints 배열 읽기
    ↓
┌─────────────────────────────────────┐
│ 필터링:                             │
│ - 처리상태 (접수, 영선팀, ...)      │
│ - 구분 (민원(CS), 민원(영선), ...)  │
│ - 날짜 (오늘, 이번주, 미연락, ...)  │
└─────────────────────────────────────┘
    ↓
ComplaintList.tsx
    ↓
각 민원 카드 표시
    ↓
상태 변경 시
    ↓
updateComplaint(id, { 상태: '새상태' })
    ↓
Supabase 업데이트
    ↓
로컬 상태 업데이트
```

### 🔧 3. 영선 페이지 (MaintenancePage.tsx)

```
complaints 배열 필터링
    ↓
┌─────────────────────────────────────┐
│ 필터 조건:                          │
│ - 구분 === '민원(영선)'             │
└─────────────────────────────────────┘
    ↓
주간/월간 달력 뷰
    ↓
처리일 기준 그룹핑
    ↓
상태 변경 시
    ↓
updateComplaint(id, { 처리일: '날짜' })
```

### 🏠 4. 객실이동 페이지 (RoomMovePage.tsx)

```
rooms 배열 읽기
    ↓
┌─────────────────────────────────────┐
│ rooms 테이블에서 로드               │
│ - 운영종료일이 있는 객실만 표시     │
└─────────────────────────────────────┘
    ↓
각 객실별 카드 표시
    ↓
┌─────────────────────────────────────┐
│ 사용자 액션:                        │
│ - 퇴실상태 변경                     │
│ - 이사일 설정                       │
│ - 관리사무소확인 체크               │
│ - 객실이동조치 입력                 │
└─────────────────────────────────────┘
    ↓
updateRoomMoveData(차수, 호실, updates)
    ↓
┌─────────────────────────────────────┐
│ 기존 민원 있음?                     │
│ Yes → updateComplaint()             │
│ No  → addComplaint() (신규 생성)    │
└─────────────────────────────────────┘
```

### ✅ 5. 객실체크 페이지 (RoomCheckPage.tsx)

```
rooms 배열 읽기
    ↓
각 객실별 체크리스트 표시
    ↓
┌─────────────────────────────────────┐
│ 체크리스트 항목:                    │
│ - 화장실, 욕실, 침실, 거실 등       │
│ - 각 항목: 이상없음 / 조치필요      │
└─────────────────────────────────────┘
    ↓
[완료] 버튼 클릭
    ↓
┌─────────────────────────────────────┐
│ complaints 테이블에 저장:           │
│ - 체크리스트데이터 (JSON)           │
│ - 이상없음건수                      │
│ - 조치필요건수                      │
│ - 특이사항 (입주/계약/퇴거)         │
└─────────────────────────────────────┘
```

### 🧹 6. 객실정비 페이지 (CleaningPage.tsx)

```
rooms 배열 필터링
    ↓
┌─────────────────────────────────────┐
│ 필터 조건:                          │
│ - 숙박형태 === '객실정비'           │
└─────────────────────────────────────┘
    ↓
각 객실별 정비 카드
    ↓
┌─────────────────────────────────────┐
│ 사용자 액션:                        │
│ - 청소상태 변경                     │
│ - 청소예정일 설정                   │
│ - 객실정비조치 입력                 │
└─────────────────────────────────────┘
```

### 📱 7. M01/M02/M03 페이지

```
rooms 배열 필터링
    ↓
┌─────────────────────────────────────┐
│ M01: 숙박형태 === '인스파이어'      │
│ M02: 숙박형태 === '장박'            │
│ M03: 숙박형태 === '객실정비'        │
└─────────────────────────────────────┘
    ↓
각 페이지별 전용 UI
    ↓
담당자 확인 버튼
    ↓
updateComplaint(id, { 
  담당자확인_M01: true  // M01
  담당자확인_M02: true  // M02
  담당자확인_M03: true  // M03
})
```

---

## 6. 상태 관리 로직

### 🔄 App.tsx의 핵심 상태

```typescript
// 메인 상태
const [complaints, setComplaints] = useState<Complaint[]>([]);
const [rooms, setRooms] = useState<RoomInfo[]>([]);
const [currentUserId, setCurrentUserId] = useState('');
const [currentPage, setCurrentPage] = useState<...>('입력');

// 필터 상태
const [selectedRoom, setSelectedRoom] = useState({ 차수: '', 호실: '' });
const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
```

### 📥 데이터 로딩 (useEffect)

```typescript
// 로그인 시 자동 실행
useEffect(() => {
  if (isLoggedIn) {
    loadComplaints();    // complaints 테이블에서 로드
    loadRooms();         // rooms 테이블에서 로드
    checkAndRunMigration(); // 자동 마이그레이션 체크
  }
}, [isLoggedIn]);
```

### ✏️ 데이터 수정 흐름

```typescript
// 1. 민원 추가
addComplaint()
  → 객실 정보 매칭
  → Supabase INSERT
  → 로컬 상태 업데이트

// 2. 민원 수정
updateComplaint(id, updates)
  → Supabase UPDATE
  → 로컬 상태 업데이트

// 3. 객실 정보 수정
updateRoom(차수, 호수, updates)
  → Supabase UPDATE
  → 로컬 상태 업데이트
  → roomDatabase 동기화

// 4. 객실이동 데이터 수정
updateRoomMoveData(차수, 호실, updates)
  → 기존 민원 찾기
  → 있으면: updateComplaint()
  → 없으면: addComplaint() (신규 생성)
```

### 🔍 필터링 로직

```typescript
// filteredComplaints 계산
const filteredComplaints = complaints.filter(c => {
  // 처리상태 필터
  if (selectedStatus && c.상태 !== selectedStatus) return false;
  
  // 구분 필터
  if (selectedCategory && c.구분 !== selectedCategory) return false;
  
  // 날짜 필터
  if (selectedDateFilter) {
    // 오늘 연락, 오늘 조치, 이번주 연락, 이번주 조치, 미연락, 미조치
    // ... 날짜 비교 로직
  }
  
  return true;
});
```

---

## 🎯 핵심 요약

### ✅ "구분"과 "처리상태" 데이터 경로

1. **입력**: `ComplaintForm.tsx`의 select 태그
2. **저장**: `formData.구분`, `formData.상태`
3. **제출**: `handleSubmit()` → `onSubmit()` → `App.addComplaint()`
4. **DB 저장**: `supabase.from('complaints').insert()`
5. **로컬 반영**: `setComplaints([new, ...old])`
6. **전체 반영**: 모든 페이지가 `complaints` 배열 참조

### 🌟 주요 특징

- **실시간 동기화**: Supabase 저장 + 로컬 상태 업데이트
- **중앙 집중 관리**: App.tsx가 모든 상태 관리
- **Props Drilling**: 각 페이지는 props로 데이터/함수 받음
- **필터링**: 각 페이지가 독립적으로 필터링 로직 구현
- **숙박형태 자동 배정**: rooms 테이블의 숙박형태로 M01/M02/M03 자동 분류

---

## 📞 문의

더 궁금한 로직이나 데이터 흐름이 있으시면 말씀해주세요!
이 문서는 BLUECARE 시스템의 완전한 데이터 흐름을 설명합니다.

**작성일**: 2026-02-18
**버전**: 1.0.0
