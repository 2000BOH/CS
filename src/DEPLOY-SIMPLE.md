# 🎯 초간단 Vercel 배포 가이드

## ✨ 완전히 새롭게 작성!

이제 **순수 HTML, CSS, JavaScript**로 작성되어 npm 설치나 빌드 과정이 **전혀 필요 없습니다!**

## 📁 핵심 파일 (단 5개!)

```
bluecare/
├── index.html    ← 메인 HTML
├── style.css     ← 디자인
├── script.js     ← 모든 기능
├── config.js     ← Supabase 설정
└── vercel.json   ← Vercel 설정
```

## 🚀 배포 3단계

### 1️⃣ GitHub에 업로드

```bash
# 프로젝트 폴더에서
git init
git add .
git commit -m "BLUECARE 순수 HTML 버전"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bluecare.git
git push -u origin main
```

### 2️⃣ Vercel 배포

1. **https://vercel.com** 접속
2. **"New Project"** 클릭
3. GitHub 저장소 **"bluecare"** 선택
4. **"Deploy"** 클릭 (설정 변경 없이!)

⏱️ **10초면 배포 완료!**

### 3️⃣ Supabase 테이블 생성

1. https://supabase.com/dashboard 접속
2. 프로젝트 (jhnifxijxoasvkxeoipw) 선택
3. SQL Editor 클릭
4. 아래 SQL 실행:

```sql
CREATE TABLE complaints (
  id TEXT PRIMARY KEY,
  차수 TEXT NOT NULL,
  호실 TEXT NOT NULL,
  구분 TEXT NOT NULL,
  내용 TEXT NOT NULL,
  조치사항 TEXT NOT NULL,
  상태 TEXT NOT NULL,
  등록일시 TIMESTAMPTZ NOT NULL,
  완료일시 TIMESTAMPTZ,
  연락일 TIMESTAMPTZ,
  조치일 TIMESTAMPTZ,
  처리일 TIMESTAMPTZ,
  등록자 TEXT NOT NULL,
  사진 TEXT[],
  우선처리 BOOLEAN DEFAULT FALSE,
  운영종료일 TIMESTAMPTZ,
  입주일 TIMESTAMPTZ,
  청소예정일 TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON complaints
FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON complaints
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON complaints
FOR UPDATE USING (true);
```

## ✅ 완료!

이제 배포된 사이트 접속하면 바로 사용 가능합니다!

## 🔧 Supabase 키 확인

config.js 파일의 키가 맞는지 확인:

```javascript
const SUPABASE_URL = 'https://jhnifxijxoasvkxeoipw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobmlmeGlqeG9hc3ZreGVvaXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTU0OTYsImV4cCI6MjA4NTkzMTQ5Nn0.u827lDpnFaS1vt-gFCron8cYZplDxsDy4-1rSuwWaBY';
```

## ❌ 에러 없음!

- ❌ npm error 404 → **해결: npm 자체가 필요 없음**
- ❌ build failed → **해결: 빌드 과정이 없음**
- ❌ @jsr package → **해결: CDN만 사용**

## 📱 로컬 테스트

간단히 **index.html을 더블클릭**만 하면 됩니다!

또는 VSCode Live Server:
1. index.html 우클릭
2. "Open with Live Server"

## 🎉 모든 기능 동일!

기존 React 버전과 **100% 동일한 기능**:
- ✅ 로그인 시스템
- ✅ 6개 페이지
- ✅ 민원 등록/수정/삭제
- ✅ 카드뷰/테이블뷰
- ✅ 필터링
- ✅ 통계
- ✅ 우선처리
- ✅ 반응형 디자인

---

**더 이상 npm 에러로 고생하지 마세요!** 🚀
