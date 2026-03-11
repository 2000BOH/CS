import { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { Logo } from './Logo';

interface LoginProps {
  onLogin: (userId: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 아이디 검증 (01~10)
    const validIds = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
    if (!validIds.includes(userId)) {
      setError('유효하지 않은 아이디입니다. (01~10)');
      return;
    }

    // 비밀번호 검증
    let correctPassword = '';
    if (userId === '10') {
      correctPassword = '1031'; // 10번은 특별 비밀번호
    } else if (userId === '08') {
      correctPassword = '1031'; // 08번도 특별 비밀번호
    } else {
      correctPassword = '0' + userId; // 01~09는 기존 방식
    }
    
    if (password !== correctPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    onLogin(userId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo className="h-24 w-auto object-contain mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-blue-600 mb-2">BLUECARE</h1>
          <p className="text-gray-600">민원관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아이디
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setError('');
                }}
                placeholder="ID"
                maxLength={2}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="비밀번호 입력"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}