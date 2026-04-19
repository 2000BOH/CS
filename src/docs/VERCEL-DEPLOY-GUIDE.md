# 🚀 Vercel 배포 가이드

BLUECARE 앱을 Vercel에 배포하는 전체 과정입니다.

---

## 📋 **1단계: 깃허브에 푸시**

```bash
git add .
git commit -m "Vercel 배포 설정 완료"
git push origin main
```

---

## 🔧 **2단계: Vercel 프로젝트 설정**

### A. Vercel 대시보드 설정

1. **https://vercel.com/dashboard** 접속
2. 프로젝트 선택 (또는 New Project)
3. **Settings** → **General** 탭

### B. Build & Development Settings

- **Framework Preset**: `Vite`
- **Build Command**: `npm run build` (또는 비워두기)
- **Output Directory**: `build`
- **Install Command**: `npm install` (또는 비워두기)

---

## 🔐 **3단계: 환경 변수 설정**

**Settings** → **Environment Variables**에서 아래 변수 추가:

| Variable Name | Value |
|--------------|-------|
| `VITE_SUPABASE_URL` | `https://jhnifxijxoasvkxeoipw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (전체 키) |

⚠️ **주의**: 모든 환경에 적용 (Production, Preview, Development)

---

## 🚀 **4단계: 배포**

### 자동 배포
- `main` 브랜치에 푸시하면 **자동 배포**

### 수동 재배포
1. **Deployments** 탭
2. 최신 배포 옆 **⋯** (점 3개) 클릭
3. **Redeploy** 클릭

---

## ✅ **배포 확인 체크리스트**

- [ ] 로그인 페이지가 정상적으로 표시됨
- [ ] 스타일/색상이 Figma Make 미리보기와 동일함
- [ ] 로그인이 작동함 (01~10 사용자 ID)
- [ ] 민원 등록이 정상 작동함
- [ ] 전체조회 페이지에서 데이터가 로드됨
- [ ] 영선/객실이동/객실정비 페이지 모두 작동함

---

## 🐛 **문제 해결**

### 문제: 스타일이 깨져 보임
**원인**: CSS 파일이 제대로 로드되지 않음  
**해결**:
1. `vite.config.ts`에 `base: './'` 설정 확인
2. `outputDirectory: 'build'` 설정 확인
3. 캐시 초기화 후 재배포

### 문제: "접속 불가" 에러
**원인**: Supabase 환경 변수 누락  
**해결**:
1. Vercel Settings → Environment Variables 확인
2. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정
3. 재배포

### 문제: 빌드 실패
**원인**: 패키지 의존성 문제  
**해결**:
```bash
# 로컬에서 테스트
npm install
npm run build
```

---

## 📁 **주요 설정 파일**

| 파일 | 설명 |
|------|------|
| `vite.config.ts` | Vite 빌드 설정 (base path, output directory) |
| `vercel.json` | Vercel 배포 설정 |
| `package.json` | 프로젝트 의존성 및 빌드 스크립트 |
| `tsconfig.json` | TypeScript 컴파일러 설정 |
| `.env.example` | 환경 변수 예시 |

---

## 🎯 **최종 배포 URL**

배포가 완료되면 다음과 같은 URL이 생성됩니다:
- **Production**: `https://your-project.vercel.app`
- **Preview**: `https://your-project-git-branch.vercel.app`

---

## 💡 **팁**

1. **도메인 연결**: Vercel Settings → Domains에서 커스텀 도메인 연결 가능
2. **자동 재배포**: 깃허브 푸시 시 자동으로 재배포됨
3. **Preview 배포**: Pull Request마다 Preview URL 생성됨
4. **로그 확인**: Deployments → 특정 배포 → View Function Logs

---

**배포 완료! 🎉**
