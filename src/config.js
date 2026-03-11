// Supabase 설정
const SUPABASE_URL = 'https://jhnifxijxoasvkxeoipw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobmlmeGlqeG9hc3ZreGVvaXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTU0OTYsImV4cCI6MjA4NTkzMTQ5Nn0.u827lDpnFaS1vt-gFCron8cYZplDxsDy4-1rSuwWaBY';

// 사용자 정보
const USERS = {
  '01': { name: '수용', canAccessAll: true },
  '02': { name: '동훈', canAccessAll: true },
  '03': { name: '시우', canAccessAll: true },
  '04': { name: '현석', canAccessAll: true },
  '05': { name: '아름', canAccessAll: true },
  '06': { name: '남식', canAccessAll: true },
  '07': { name: '영선', canAccessAll: true },
  '08': { name: '기타', canAccessAll: true },
  '09': { name: '키핑', canAccessAll: true },
  '10': { name: '키핑팀', canAccessAll: false }
};

// 상태 색상
const STATUS_COLORS = {
  '접수': '#ef4444',
  '영선팀': '#f97316',
  '진행중': '#eab308',
  '부서이관': '#3b82f6',
  '외부업체': '#8b5cf6',
  '완료': '#10b981'
};

// 구분 색상
const CATEGORY_COLORS = {
  'A': '#ef4444',
  'B': '#f97316',
  'C': '#eab308',
  'D': '#84cc16',
  'E': '#10b981',
  'F': '#06b6d4',
  'G': '#3b82f6',
  'H': '#8b5cf6'
};
