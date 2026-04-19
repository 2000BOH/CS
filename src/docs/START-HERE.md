# 🚀 여기서 시작하세요!

## ✨ 순수 HTML 버전으로 완전히 새로 작성했습니다!

더 이상 npm, React, TypeScript, Vite 필요 없습니다!

## 📁 핵심 파일 (이것만 있으면 됩니다!)

```
🎯 배포에 필요한 파일:
├── index.html      ← 메인 HTML
├── style.css       ← 모든 스타일  
├── script.js       ← 모든 기능
├── config.js       ← Supabase 설정
└── vercel.json     ← Vercel 라우팅

📂 기존 파일들 (무시하세요):
├── App.tsx         ← 이전 React 버전
├── components/     ← 이전 React 컴포넌트들
├── utils/          ← 이전 유틸리티들
└── ...
```

## 🎯 1분 안에 배포하기

### 1. 로컬에서 테스트 (선택사항)

**index.html** 파일을 **더블클릭**하면 브라우저에서 바로 실행됩니다!

### 2. GitHub에 업로드

```bash
# 터미널에서 프로젝트 폴더로 이동
cd bluecare

# Git 초기화 (처음만)
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "BLUECARE 순수 HTML 버전"

# 메인 브랜치로 변경
git branch -M main

# GitHub 저장소 연결 (본인의 저장소 URL로 변경!)
git remote add origin https://github.com/YOUR_USERNAME/bluecare.git

# 업로드!
git push -u origin main
```

### 3. Vercel 배포 (초간단!)

1. **https://vercel.com** 접속
2. **"New Project"** 클릭
3. GitHub에서 **"bluecare"** 저장소 선택
4. **"Deploy"** 클릭 (아무것도 변경하지 마세요!)

⏱️ **10초 후 배포 완료!**

### 4. Supabase 테이블 생성

1. **https://supabase.com/dashboard** 접속
2. 프로젝트 선택 (jhnifxijxoasvkxeoipw)
3. **SQL Editor** 클릭
4. 배포된 사이트의 **"안내"** 페이지에서 SQL 코드 복사
5. SQL Editor에 붙여넣기 → **RUN** 클릭

## ✅ 완료!

이제 배포된 URL로 접속하면 바로 사용할 수 있습니다!

## 🔐 로그인 테스트

| ID | 이름 | 설명 |
|----|------|------|
| 01 | 수용 | 모든 기능 사용 가능 |
| 10 | 키핑팀 | 객실정비만 사용 가능 |

## 🎉 모든 기능 동일!

기존 React 버전과 **100% 동일한 기능**:
- ✅ 로그인/로그아웃
- ✅ 6개 페이지 (입력, 전체조회, 영선, 객실이동, 객실정비, 안내)
- ✅ 민원 등록/수정/삭제
- ✅ 카드뷰/테이블뷰 전환
- ✅ 상태/구분 클릭 수정
- ✅ 실시간 통계
- ✅ 우선처리 표시
- ✅ 날짜 포맷 (yy.mm.dd)
- ✅ 모바일 반응형

## ❌ 더 이상 이런 에러 없음!

- ❌ `npm error 404 @jsr/...` 
- ❌ `Module not found`
- ❌ `Build failed`
- ❌ `TypeScript error`
- ❌ `Cannot find package`

## 📚 상세 가이드

- **DEPLOY-SIMPLE.md** - 배포 상세 가이드
- **FINAL-CHECKLIST.md** - 최종 체크리스트
- **README.md** - 프로젝트 소개

## 🆘 문제 발생 시

1. **config.js**에서 Supabase URL과 키 확인
2. Supabase에서 테이블이 생성되었는지 확인
3. 브라우저 콘솔(F12)에서 에러 메시지 확인

## 🔄 업데이트 방법

코드 수정 후:

```bash
git add .
git commit -m "업데이트 내용"
git push
```

Vercel이 자동으로 재배포합니다!

---

## 💡 빠른 시작

```bash
# 1. GitHub 업로드
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bluecare.git
git push -u origin main

# 2. Vercel.com에서 Deploy 클릭!

# 3. Supabase에서 SQL 실행!

# ✅ 완료!
```

---

**지금 바로 배포하세요!** 🚀
