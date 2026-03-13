# Supabase Auth 로그인 설정 안내

이 앱은 **Supabase Authentication**으로 로그인합니다.  
아이디(01~10) + 비밀번호 입력 방식은 그대로이고, 비밀번호 검증만 Supabase에서 처리합니다.

## 1. Supabase에서 이메일 인증 끄기 (권장)

관리자만 쓰는 내부 앱이므로 이메일 인증을 끄면 편합니다.

1. [Supabase 대시보드](https://supabase.com/dashboard) → 프로젝트 선택
2. **Authentication** → **Providers** → **Email**
3. **Confirm email** 를 **OFF** 로 두기 (이메일 인증 없이 로그인)

## 2. 사용자(01~10번) 추가하기

로그인할 수 있도록 각 번호마다 **한 명씩** 사용자를 만들어야 합니다.

### 방법 A: 대시보드에서 수동 추가 (추천)

1. **Authentication** → **Users** → **Add user** → **Create new user**
2. 아래처럼 **10명** 반복해서 추가합니다.

| 아이디(직원번호) | Email                 | Password (원하는 비밀번호로 설정) | User Metadata (선택)   |
|-----------------|------------------------|-----------------------------------|------------------------|
| 01              | `01@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "01"}`   |
| 02              | `02@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "02"}`   |
| 03              | `03@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "03"}`   |
| 04              | `04@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "04"}`   |
| 05              | `05@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "05"}`   |
| 06              | `06@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "06"}`   |
| 07              | `07@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "07"}`   |
| 08              | `08@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "08"}`   |
| 09              | `09@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "09"}`   |
| 10              | `10@bluecare.local`   | 비밀번호 설정                      | `{"staff_id": "10"}`   |

- **Email**: 반드시 `01@bluecare.local` ~ `10@bluecare.local` 형식
- **Password**: 각 직원에게 전달할 비밀번호 (코드에 적지 말고 따로 전달)
- **User Metadata**: 비워도 됨. 넣을 경우 `{"staff_id": "01"}` 처럼 `staff_id`만 맞추면 됨.

### 방법 B: SQL로 사용자 추가 (고급)

Supabase **SQL Editor**에서 아래는 **실행하지 마세요**.  
사용자 생성은 대시보드 **Authentication → Users → Add user** 로만 할 수 있고, 비밀번호는 반드시 대시보드나 “비밀번호 재설정 링크”로만 설정 가능합니다.  
즉, **방법 A**로 10명만 추가하면 됩니다.

## 3. 비밀번호 규칙

- Supabase 기본: **6자 이상** 권장
- 각 직원(01~10)마다 **서로 다른 비밀번호**를 설정하고, 코드나 공개 문서에 적지 말 것

## 4. 처음 설정 후 확인

1. 앱 실행 후 로그인 화면에서 **아이디 01**, **방금 설정한 비밀번호** 입력
2. 로그인되면 Supabase Auth 설정이 정상 동작하는 것입니다.
3. 02~10번도 같은 방식으로 이메일(`02@bluecare.local` 등)로 사용자 추가 후 로그인 테스트하면 됩니다.

## 5. 문제 해결

- **"Invalid login credentials"**  
  - 이메일이 `01@bluecare.local` 형식인지, 비밀번호가 맞는지 확인  
  - Supabase **Authentication → Users**에 해당 이메일 사용자가 있는지 확인

- **이메일 인증 메일이 온다**  
  - **Authentication → Providers → Email** 에서 **Confirm email** 을 끄면 됨

- **특정 번호만 로그인 안 됨**  
  - 그 번호에 해당하는 이메일(`09@bluecare.local` 등) 사용자가 **Users**에 있는지 확인

이 설정이 끝나면, **비밀번호는 코드에 전혀 없고** Supabase에서만 관리됩니다.
