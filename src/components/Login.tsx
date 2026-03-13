import { useState } from 'react';
import { Lock, User, Loader2 } from 'lucide-react';
import { Logo } from './Logo';
import { supabase } from '../utils/supabase/client';

// 번호(01~10)와 이메일 앞부분(local-part) 매핑
const ID_TO_LOCAL: Record<string, string> = {
  '01': 'adm',
  '02': 'cs01',
  '03': 'cs02',
  '04': 'cs03',
  '05': 'mgr01',
  '06': 'mgr02',
  '07': 'eng',
  '08': 'mo',
  '09': 'hk',
  '10': 'cln',
};

const LOCAL_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ID_TO_LOCAL).map(([id, local]) => [local, id]),
) as Record<string, string>;

const normalizeToId = (value: string | undefined | null): string | undefined => {
  if (!value) return undefined;
  const v = value.toString();
  if (ID_TO_LOCAL[v]) return v;              // 이미 01~10 형태
  if (LOCAL_TO_ID[v]) return LOCAL_TO_ID[v]; // adm, cs01 등
  return undefined;
};

const AUTH_EMAIL_DOMAIN = 'blue.com';

interface LoginProps {
  onLogin: (userId: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const trimmedId = userId.trim();

      // 입력이 이메일이면 그대로 사용
      let email = trimmedId;
      if (!trimmedId.includes('@')) {
        // 숫자 01~10 또는 약어(adm, cs01 등)만 입력한 경우 이메일로 변환
        const numericId = ID_TO_LOCAL[trimmedId];
        const localFromId = numericId ?? trimmedId;
        const localPart = LOCAL_TO_ID[localFromId] ? localFromId : ID_TO_LOCAL[trimmedId] ?? trimmedId;
        email = `${localPart}@${AUTH_EMAIL_DOMAIN}`;
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: password.trim(),
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('아이디(e-mail) 또는 비밀번호가 일치하지 않습니다.');
        } else {
          setError(signInError.message || '로그인에 실패했습니다.');
        }
        return;
      }

      const userEmail = data.user?.email ?? '';
      const localPart = userEmail.split('@')[0] ?? '';

      const metaStaff = normalizeToId(data.user?.user_metadata?.staff_id);
      let staffId =
        metaStaff ??
        normalizeToId(localPart) ??
        trimmedId;
      onLogin(staffId);
    } catch (err) {
      console.error('로그인 오류:', err);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-2">
      <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-xs">
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <Logo className="h-14 w-auto object-contain mx-auto" />
          </div>
          <h1 className="text-xl font-bold text-blue-600 mb-0.5">BLUECARE</h1>
          <p className="text-gray-600 text-xs">민원관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {/* label text intentionally left blank */}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setError('');
                }}
                placeholder=""
                className="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {/* label text intentionally left blank */}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder=""
                className="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                로그인 중...
              </>
            ) : (
              '로그인'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
