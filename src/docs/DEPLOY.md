# 🚀 BLUECARE Vercel 배포 가이드

## ✅ 배포 준비 완료!

이제 **Figma Make 미리보기와 똑같은 디자인**으로 Vercel에 배포할 수 있습니다!

---

## 📦 **방법 1: 깃허브 → Vercel 자동 배포** (추천)

### 1️⃣ 깃허브에 푸시
```bash
git add .
git commit -m "Vercel 배포 설정 완료"
git push origin main
```

### 2️⃣ Vercel에서 설정
1. [Vercel 대시보드](https://vercel.com) 접속
2. **Import Project** 클릭
3. 깃허브 저장소 선택
4. **Framework Preset**: **Vite** 선택
5. **Build Command**: `npm run build` (자동 입력됨)
6. **Output Directory**: `dist` (자동 입력됨)
7. **Deploy** 클릭!

### 3️⃣ 배포 완료! 🎉
- Vercel이 자동으로 빌드하고 배포합니다
- 배포 URL: `https://your-project.vercel.app`

---

## 🔧 **방법 2: Vercel CLI로 배포**

### 1️⃣ Vercel CLI 설치
```bash
npm install -g vercel
```

### 2️⃣ 로그인
```bash
vercel login
```

### 3️⃣ 배포
```bash
vercel --prod
```

---

## ⚙️ **환경 변수 설정**

Vercel 대시보드에서 환경 변수를 추가하세요:

1. 프로젝트 → **Settings** → **Environment Variables**
2. 다음 변수 추가:
   - `VITE_SUPABASE_URL`: `https://jhnifxijxoasvkxeoipw.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `your-anon-key`

---

## 📝 **Supabase 테이블 설정**

배포 후 처음 한 번만 실행하세요:

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. **SQL Editor** 열기
3. 아래 SQL 실행:

```sql
CREATE TABLE complaints (
  id TEXT PRIMARY KEY,
  차수 TEXT NOT NULL,
  호실 TEXT NOT NULL,
  구분 TEXT NOT NULL,
  내용 TEXT NOT NULL,
  조치사항 TEXT,
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

CREATE POLICY "Enable delete access for all users" ON complaints
FOR DELETE USING (true);
```

---

## ✅ **배포 체크리스트**

- [x] package.json 생성 완료
- [x] vite.config.ts 생성 완료
- [x] tsconfig.json 생성 완료
- [x] index.html React 진입점 설정 완료
- [x] src/main.tsx 생성 완료
- [x] vercel.json 설정 완료
- [x] .gitignore 생성 완료

---

## 🎯 **배포 후 확인사항**

1. ✅ 로그인 화면이 보이나요?
2. ✅ 디자인이 Figma Make 미리보기와 똑같나요?
3. ✅ 민원 등록이 잘 되나요?
4. ✅ 데이터가 Supabase에 저장되나요?

---

## 🆘 **문제 해결**

### 빌드 실패 시
```bash
# 로컬에서 테스트
npm install
npm run build
npm run preview
```

### 디자인이 다를 때
- 브라우저 캐시 삭제 (Ctrl + Shift + R)
- Vercel 대시보드에서 **Redeploy** 클릭

### 데이터가 안 보일 때
- Supabase SQL이 실행되었는지 확인
- 브라우저 콘솔(F12)에서 에러 확인

---

## 📞 **지원**

문제가 있으면 알려주세요! 🙂
