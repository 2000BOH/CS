# BLUECARE - 블루오션 레지던스 호텔 민원관리 시스템

순수 HTML, CSS, JavaScript로 구현된 민원관리 웹앱입니다.

## 🚀 Vercel 배포 (초간단!)

### 1. GitHub에 업로드

```bash
git init
git add .
git commit -m "BLUECARE 순수 HTML 버전"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bluecare.git
git push -u origin main
```

### 2. Vercel에서 배포

1. https://vercel.com 접속
2. "New Project" 클릭
3. GitHub 저장소 연결
4. **그냥 "Deploy" 클릭!**

**빌드 설정 필요 없음!** 순수 HTML이라 npm install 불필요합니다.

### 3. Supabase 설정

배포 완료 후 **config.js 파일 수정**:

```javascript
const SUPABASE_URL = 'https://jhnifxijxoasvkxeoipw.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 4. Supabase 테이블 생성

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 → SQL Editor
3. 앱의 "안내" 페이지에서 SQL 복사 후 실행

## ✅ 완료!

- ✅ npm 설치 불필요
- ✅ 빌드 과정 불필요
- ✅ 환경변수 설정 불필요
- ✅ Supabase는 CDN으로 로드

## 📁 파일 구조

```
bluecare/
├── index.html    # 메인 HTML
├── style.css     # 스타일
├── script.js     # JavaScript 로직
├── config.js     # Supabase 설정
└── vercel.json   # Vercel 라우팅
```

## 🔐 로그인 정보

| ID | 이름 | 권한 |
|----|------|------|
| 01 | 수용 | 전체 |
| 02 | 동훈 | 전체 |
| 03 | 시우 | 전체 |
| 04 | 현석 | 전체 |
| 05 | 아름 | 전체 |
| 06 | 남식 | 전체 |
| 07 | 영선 | 전체 |
| 08 | 기타 | 전체 |
| 09 | 키핑 | 전체 |
| 10 | 키핑팀 | 객실정비만 |

## 📱 기능

- ✅ 민원 등록/수정/삭제
- ✅ 6개 페이지 (입력, 전체조회, 영선, 객실이동, 객실정비, 안내)
- ✅ 카드뷰/테이블뷰 전환
- ✅ 상태 및 구분 클릭 수정
- ✅ 실시간 통계
- ✅ 우선처리 표시
- ✅ 날짜 포맷 (yy.mm.dd)
- ✅ 반응형 디자인

## 🌐 기술 스택

- HTML5
- CSS3
- Vanilla JavaScript
- Supabase (CDN)

---

© 2026 블루오션 레지던스 호텔
