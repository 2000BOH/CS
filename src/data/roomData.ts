// 통합 문서01.xlsx의 데이터를 모방한 호실 정보
export interface RoomInfo {
  차수: string;
  호실: string;
  입주민: string;
  전화번호: string;
  숙박형태: string;
  타입?: string; // 룸 타입 정보 추가
}

// 가상 데이터 제거 - Supabase rooms 테이블에서 실제 데이터를 가져옵니다
export const roomDatabase: RoomInfo[] = [];

export function getRoomInfo(차수: string, 호실: string): RoomInfo | undefined {
  // 입력값이 없으면 undefined 반환
  if (!차수 || !호실) {
    return undefined;
  }
  
  // 차수 정규화: "1차" → "1", "1" → "1" (숫자만 추출)
  const 차수숫자 = String(차수).replace(/[^0-9]/g, '');
  const 호실숫자 = String(호실).replace(/[^0-9]/g, '');
  
  return roomDatabase.find(room => {
    // room.차수가 없으면 스킵
    if (room.차수 == null || room.호실 == null) {
      return false;
    }
    const room차수숫자 = String(room.차수).replace(/[^0-9]/g, '');
    const room호실숫자 = String(room.호실).replace(/[^0-9]/g, '');
    return room차수숫자 === 차수숫자 && room호실숫자 === 호실숫자;
  });
}