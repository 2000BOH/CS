# 🚀 BLUECARE 로컬 실행 가이드

이 문서는 **Figma Make에서 다운로드한 프로젝트를 Cursor/VS Code에서 실행**하는 방법입니다.

---

## ✅ 사전 준비 (처음 한 번만)

### 1. Node.js 설치 확인

터미널(또는 명령 프롬프트)을 열고 입력:

```bash
node --version
```

버전이 나오면 OK! (예: v18.17.0)  
에러가 나면 → https://nodejs.org 에서 다운로드 설치

---

## 🎯 실행 방법 (3단계)

### **1단계: Cursor에서 프로젝트 열기**

1. Figma Make에서 프로젝트 다운로드
2. 압축 해제
3. Cursor에서 `File → Open Folder` → 해제한 폴더 선택

### **2단계: 터미널에서 의존성 설치**

Cursor 하단의 터미널에서 입력:

```bash
npm install
```

⏱️ 처음엔 1-2분 걸림 (node_modules 폴더 생성됨)

### **3단계: 개발 서버 실행**

```bash
npm run dev
```

터미널에 이렇게 나오면 성공:

```
  VITE v6.0.1  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**Ctrl + 클릭** 또는 브라우저에서 `http://localhost:3000` 접속!

---

## 🎨 확인사항

브라우저에서 열었을 때:
- ✅ 로그인 화면이 보임
- ✅ 파란색 BLUECARE 로고
- ✅ Tailwind CSS 스타일 적용됨
- ✅ Figma Make에서 보던 것과 동일

---

## 🛑 서버 종료 방법

터미널에서 `Ctrl + C` 누르면 종료

---

## 🔧 문제 해결

### ❌ "command not found: npm"
→ Node.js 미설치. https://nodejs.org 에서 설치

### ❌ 포트 3000이 이미 사용 중
→ `vite.config.ts` 파일 열고 포트 변경:
```typescript
server: {
  port: 3001, // 다른 번호로 변경
},
```

### ❌ 스타일이 안 나옴 (흰 화면, 버튼이 이상함)
→ 캐시 삭제 후 재설치:
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### ❌ Supabase 연결 오류
→ 괜찮습니다! 이미 `utils/supabase/info.tsx`에 설정되어 있어요.
   로컬에서도 Figma Make와 동일한 Supabase 프로젝트를 사용합니다.

---

## 📝 개발 시 참고사항

### 파일 수정 시
- 파일 저장하면 **자동으로 브라우저 새로고침** (Hot Reload)
- 서버 재시작 불필요

### 주요 파일 위치
```
/App.tsx                    # 메인 앱
/components/               # 모든 컴포넌트
/styles/globals.css        # 전역 스타일
/utils/supabase/          # Supabase 설정
```

### 빌드 (배포용)
```bash
npm run build
```
→ `dist` 폴더에 프로덕션 파일 생성

---

## ✨ 정리

**처음 실행:**
```bash
npm install
npm run dev
```

**그 다음부터:**
```bash
npm run dev
```

이게 전부입니다! 🎉

---

## 💡 Tip

- Cursor에서 `Ctrl + ~` (물결표) 누르면 터미널 열림
- 터미널 여러 개 열 수 있음 (서버 + 다른 작업용)
- `npm run dev` 실행 중에는 터미널 닫으면 안 됨

**이제 Figma Make와 똑같이 작동하는 로컬 환경 완성!** 🚀
