export interface Complaint {
  id: string;
  차수: string;
  호실: string;
  구분: string;
  타입?: string; // 룸 타입 정보
  내용: string;
  조치사항: string;
  객실이동조치?: string; // 객실이동 페이지 전용 조치사항
  객실정비조치?: string; // 객실정비 페이지 전용 조치사항
  관리사무소확인?: boolean; // 객실이동 페이지 관리사무소 체크박스
  상태: '접수' | '처리중' | '영선이관' | '외부업체' | '완료' | '영선팀' | '진행중' | '부서이관' | '청소요청';
  등록일시: string;
  완료일시?: string;
  연락일?: string;
  조치일?: string;
  처리일?: string; // 영선 페이지 처리일자 기준
  등록자: string;
  사진?: string[];
  우선처리?: boolean; // 우선처리 플래그
  운영종료일?: string; // 객실이동 페이지용
  입주일?: string; // 객실이동 페이지용
  청소예정일?: string; // 객실정비 페이지용
  청소상태?: string; // 객실정비 페이지 전용 정비상태
  퇴실상태?: '준비' | '연락완료' | '퇴실완료' | '완료'; // 객실이동 페이지 퇴실 상태
  이사일?: string; // 객실이동 페이지 이사일
  계약서파일?: string; // 계약서 PDF 파일 (base64)
  계약서파일명?: string; // 계약서 파일명
  숙박형태?: string; // 숙박형태
  도어락비번?: string; // 객실정비 페이지 도어락 비밀번호
  담당자확인_M01?: boolean; // M01 페이지 담당자 확인
  담당자확인_M02?: boolean; // M02 페이지 담당자 확인
  담당자확인_M03?: boolean; // M03 페이지 담당자 확인
  지원상태?: '요청' | '완료'; // M04 지원 페이지 플로우 (요청=대기, 완료=처리완료)
  지원요청일시?: string;
  지원완료일시?: string;
  // 객실체크 페이지 전용 필드
  퇴실점검일?: string;
  점검자?: string;
  체크리스트데이터?: string; // JSON 문자열
  이상없음건수?: number;
  조치필요건수?: number;
  입주시특이사항?: string;
  계약기간특이사항?: string;
  퇴거시특이사항?: string;
}

export interface RoomInfo {
  차수: string;
  호수: string;
  타입?: string;
  운영종료일?: string;
  숙박형태?: string;
  임차인?: string;
  임차인연락처?: string;
  이전임차인?: string; // 이전 입주민 이름
  이전임차인연락처?: string; // 이전 입주민 연락처
  변경일시?: string; // 입주민 정보 변경 일시
}
