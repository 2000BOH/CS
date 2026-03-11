// 날짜 포맷 유틸리티 함수

// 요일 배열 (한국어)
const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

// yy.mm.dd (요일) 형식으로 날짜 표시 - 년도에서 20을 빼고 요일 추가
export const formatShortDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const yy = String(year - 2000).padStart(2, '0'); // 2000년을 빼서 실질적으로 20을 뺀 효과
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const day = DAYS_KR[date.getDay()];
  return `${yy}.${mm}.${dd} (${day})`;
};

// 시간 포맷 (툴팁용)
export const formatTime = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// 날짜와 시간 전체 포맷 (툴팁용) - 년도에서 20을 빼고 요일 추가
export const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const yy = String(year - 2000).padStart(2, '0'); // 2000년을 빼서 실질적으로 20을 뺀 효과
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const day = DAYS_KR[date.getDay()];
  return `${yy}.${mm}.${dd} (${day}) ${hours}:${minutes}`;
};

// Date 객체를 yy.mm.dd (요일)로 변환 - 년도에서 20을 빼고 요일 추가
export const dateToShortString = (date: Date | undefined): string => {
  if (!date) return '날짜 선택';
  const year = date.getFullYear();
  const yy = String(year - 2000).padStart(2, '0'); // 2000년을 빼서 실질적으로 20을 뺀 효과
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const day = DAYS_KR[date.getDay()];
  return `${yy}.${mm}.${dd} (${day})`;
};

// Date 객체를 yyyy.mm.dd (요일)로 변환 (출력용)
export const dateToFullString = (date: Date | undefined): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const yy = String(year - 2000).padStart(2, '0'); // 2000년을 빼서 실질적으로 20을 뺀 효과
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const day = DAYS_KR[date.getDay()];
  return `${yy}.${mm}.${dd} (${day})`;
};