# BLUECARE - 빠른 시작 ⚡

## 3줄 요약

```bash
npm install        # 1. 설치
npm run dev        # 2. 실행
# 3. http://localhost:3000 접속
```

---

## 📦 프로젝트 구조

```
bluecare/
├── App.tsx                      # 메인 앱
├── components/                  # 모든 페이지/컴포넌트
│   ├── Login.tsx               # 로그인
│   ├── InputPage.tsx           # 민원 등록
│   ├── AllComplaintsPage.tsx  # 전체 민원
│   ├── MaintenancePage.tsx    # 영선 페이지
│   ├── CleaningPage.tsx       # 객실정비
│   ├── RoomCheckPage.tsx      # 객실체크
│   ├── RoomMovePage.tsx       # 객실이동
│   ├── AccommodationTypePage.tsx # 숙박형태
│   ├── M01Page.tsx            # 인스파이어 관리
│   ├── M02Page.tsx            # 장박 고객
│   └── M03Page.tsx            # 객실정비 일반
├── styles/globals.css          # 전역 스타일
├── utils/supabase/             # Supabase 설정
└── data/roomData.ts            # 객실 데이터

설정 파일:
├── tailwind.config.js          # Tailwind CSS
├── postcss.config.js           # PostCSS
├── vite.config.ts              # Vite 빌드 도구
└── package.json                # 의존성
```

---

## 🔑 주요 기능

### 기본 페이지 (6개)
1. **민원 등록** - 차수, 호실, 구분, 내용, 조치사항
2. **전체 민원** - 모든 민원 조회
3. **영선 페이지** - 영선 구분 민원 관리
4. **객실이동** - 입실/퇴실 관리
5. **객실정비** - 청소 상태 관리
6. **객실체크** - 객실 현황 확인

### 개인업무 관리 (3개)
- **M01** - 인스파이어 입실/퇴실
- **M02** - 장박 고객 관리
- **M03** - 객실정비 및 일반

### 추가 페이지
- **숙박형태** - 객실 타입별 통계

---

## 🎨 디자인 시스템

- **프레임워크**: React 18 + TypeScript
- **스타일링**: Tailwind CSS v3
- **날짜 형식**: `yy.mm.dd (요일)` (시간은 툴팁)
- **상태 단계**: 6단계 (접수 → 영선팀 → 진행중 → 부서이관 → 외부업체 → 완료)

---

## 🔐 계정별 권한

| 계정번호 | 권한 |
|---------|------|
| 07번 | 영선 페이지만 |
| 08번 | 객실이동 페이지만 |
| 10번 | 객실정비 페이지만 |
| 기타 | 모든 페이지 |

---

## 💾 데이터베이스 (Supabase)

### 주요 테이블
- **complaints** - 민원 데이터
- **rooms** - 객실 정보 (숙박형태 기준)
- **kv_store_4d90a2a9** - Key-Value 저장소

### 연결 정보
이미 `utils/supabase/info.tsx`에 설정됨 (수정 불필요)

---

## 🛠️ 개발 명령어

```bash
npm run dev          # 개발 서버 (포트 3000)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기
npm run type-check   # TypeScript 검사
```

---

## 📱 반응형

- 데스크톱 최적화
- 모바일 대응
- 태블릿 지원

---

## 🐛 디버깅

### Chrome DevTools 사용
1. F12 키 (개발자 도구)
2. Console 탭 - 에러 메시지 확인
3. Network 탭 - API 요청 확인

### React DevTools (추천)
Chrome 확장 프로그램 설치:
https://chrome.google.com/webstore/detail/react-developer-tools

---

## 🚀 배포

### Vercel (추천)
1. GitHub에 푸시
2. https://vercel.com 에서 Import
3. 자동 배포

자세한 내용: `VERCEL-DEPLOY-GUIDE.md` 참조

---

## 📚 사용된 라이브러리

```json
{
  "react": "^18.3.1",
  "typescript": "~5.6.2",
  "tailwindcss": "^3.4.1",
  "@supabase/supabase-js": "^2.39.0",
  "lucide-react": "^0.447.0",
  "recharts": "^2.13.3",
  "date-fns": "^4.1.0",
  "xlsx": "^0.18.5"
}
```

---

## ❓ 자주 묻는 질문

**Q: Figma Make와 똑같이 보이나요?**  
A: 네! `npm run dev` 후 localhost:3000 접속하면 동일합니다.

**Q: HTML 파일만 열면 안 되나요?**  
A: React는 빌드 과정이 필요해서 개발 서버를 실행해야 합니다.

**Q: 수정 후 저장하면?**  
A: 자동으로 브라우저가 새로고침됩니다 (Hot Reload).

**Q: 인터넷 없이 작동하나요?**  
A: 프론트엔드는 작동하지만, Supabase(백엔드)는 인터넷 필요.

---

## 🎯 다음 단계

1. ✅ 로컬 실행 성공
2. 📝 코드 수정 및 커스터마이징
3. 🧪 테스트
4. 🚀 배포

---

**더 자세한 가이드:** `START-HERE-로컬실행가이드.md` 참조

**문제 발생 시:** 터미널의 에러 메시지를 확인하세요!

---

Made with ❤️ for 블루오션 레지던스 호텔
