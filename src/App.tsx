import { useState, useEffect } from 'react';
import { PenLine, Search, Wrench, ArrowRightLeft, ClipboardCheck, Sparkles, Bed, History, Info } from 'lucide-react';
import { Complaint, RoomInfo } from './types';
import { InputPage } from './components/InputPage';
import { AllComplaintsPage } from './components/AllComplaintsPage';
import { MaintenancePage } from './components/MaintenancePage';
import { RoomMovePage } from './components/RoomMovePage';
import { RoomCheckPage } from './components/RoomCheckPage';
import { CleaningPage } from './components/CleaningPage';
import { InfoPage } from './components/InfoPage';
import { M01Page } from './components/M01Page';
import { M02Page } from './components/M02Page';
import { M03Page } from './components/M03Page';
import { M04Page } from './components/M04Page';
import { AccommodationTypePage } from './components/AccommodationTypePage';
import { RoomHistoryPage } from './components/RoomHistoryPage';
import { AdminDashboard } from './components/AdminDashboard';
import { Login } from './components/Login';
import { Logo } from './components/Logo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase } from './utils/supabase/client';
import { roomDatabase } from './data/roomData';

const PAGE_ICONS: Record<string, (props: { className?: string }) => JSX.Element> = {
  '입력': PenLine,
  '전체조회': Search,
  '영선': Wrench,
  '객실이동': ArrowRightLeft,
  '객실체크': ClipboardCheck,
  '객실정비': Sparkles,
  '숙박형태': Bed,
  '객실히스토리': History,
  '안내/입력': Info,
};


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentPage, setCurrentPage] = useState<'입력' | '전체조회' | '영선' | '객실이동' | '객실체크' | '객실정비' | '안내/입력' | '숙박형태' | '객실히스토리' | 'M01' | 'M02' | 'M03' | 'M04' | '관리자'>('입력');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]); // 객실정보 상태 추가

  const [selectedRoom, setSelectedRoom] = useState({ 차수: '', 호실: '' });
  const [formRoom, setFormRoom] = useState({ 차수: '', 호실: '' });
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Supabase 세션 복원 및 로그인 상태 유지
  useEffect(() => {
    const emailLocalToId: Record<string, string> = {
      adm: '01',
      cs01: '02',
      cs02: '03',
      cs03: '04',
      mgr01: '05',
      mgr02: '06',
      eng: '07',
      mo: '08',
      hk: '09',
      cln: '10',
    };

    const normalizeToId = (value: string | undefined | null): string | undefined => {
      if (!value) return undefined;
      const v = value.toString();
      if (/^(0[1-9]|10)$/.test(v)) return v;
      if (emailLocalToId[v]) return emailLocalToId[v];
      return undefined;
    };

    const getUserIdFromSession = (user: { email?: string | null; user_metadata?: { staff_id?: string } }) => {
      const fromMeta = normalizeToId(user?.user_metadata?.staff_id);
      if (fromMeta) return fromMeta;
      const email = user?.email ?? '';
      const localPart = email.split('@')[0];
      const fromLocal = normalizeToId(localPart);
      if (fromLocal) return fromLocal;
      return '';
    };

    const applySession = (session: { user: { email?: string | null; user_metadata?: { staff_id?: string } } } | null) => {
      if (!session?.user) {
        setIsLoggedIn(false);
        setCurrentUserId('');
        localStorage.removeItem('currentUserId');
        return;
      }
      const userId = getUserIdFromSession(session.user);
      if (userId) {
        setIsLoggedIn(true);
        setCurrentUserId(userId);
        localStorage.setItem('currentUserId', userId);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 역할별 메뉴에 현재 페이지가 없으면 첫 번째 허용 페이지로 이동 (화이트 스크린/되돌리기 불가 방지)
  useEffect(() => {
    if (!currentUserId) return;
    const allowed = currentUserId === '10' ? ['객실정비'] : currentUserId === '08' ? ['객실이동'] : currentUserId === '07' ? ['영선'] : currentUserId === '01' ? ['입력', '전체조회', '영선', '객실이동', '객실체크', '객실정비', '숙박형태', '객실히스토리', '안내/입력', 'M03', 'M02', 'M01', 'M04', '관리자'] : ['입력', '전체조회', '영선', '객실이동', '객실체크', '객실정비', '숙박형태', '객실히스토리', '안내/입력', 'M03', 'M02', 'M01', 'M04'];
    if (allowed.length > 0 && !allowed.includes(currentPage)) {
      setCurrentPage(allowed[0] as typeof currentPage);
    }
  }, [currentUserId, currentPage]);

  // Supabase에서 민원 데이터 로드
  useEffect(() => {
    if (isLoggedIn) {
      loadComplaints();
      loadRooms();
    }
  }, [isLoggedIn]);

  const loadComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('등록일시', { ascending: false });

      if (error) {
        // 테이블이 없는 경우 무시
        if (error.code === 'PGRST205') {
          return;
        }

        // 컬럼이 없는 경우 경고 표시하지만 계속 진행
        if (error.message?.includes('column') || error.code === 'PGRST204') {
          console.warn('⚠️ 데이터베이스 컬럼이 없습니다:', error.message);
          console.warn('📌 안내/입력 페이지에서 SQL 마이그레이션을 실행하세요.');
          // 빈 데이터로 설정하여 앱이 계속 작동하도록 함
          setComplaints([]);
          return;
        }

        console.error('민원 데이터 로드 오류:', error);
        return;
      }

      if (data) {
        // 🔍 디버깅: 첫 번째 데이터의 구조 확인
        if (data.length > 0) {
        }
        // 깨진 한글 데이터 복구 (DB에 저장된 깨진 문자열 정규화)
        const sanitized = (data as Complaint[]).map(c => {
          const validStatuses = ['접수', '처리중', '영선이관', '외부업체', '완료', '영선팀', '진행중', '부서이관', '청소요청'];
          let fixedStatus = c.상태;
          if (!validStatuses.includes(fixedStatus)) {
            // 부분 매칭으로 복구 시도
            if (fixedStatus?.includes('외부')) fixedStatus = '외부업체';
            else if (fixedStatus?.includes('접수') || fixedStatus?.includes('접')) fixedStatus = '접수';
            else if (fixedStatus?.includes('영선이관')) fixedStatus = '영선이관';
            else if (fixedStatus?.includes('영선')) fixedStatus = '영선이관';
            else if (fixedStatus?.includes('처리') || fixedStatus?.includes('진행')) fixedStatus = '처리중';
            else if (fixedStatus?.includes('이관')) fixedStatus = '영선이관';
            else if (fixedStatus?.includes('완료')) fixedStatus = '완료';
            else fixedStatus = '접수'; // 기본값

            if (fixedStatus !== c.상태) {
              // DB도 자동 복구
              supabase.from('complaints').update({ 상태: fixedStatus }).eq('id', c.id).then(({ error }) => {
                if (error) console.warn('DB 상태 복구 실패:', error);
              });
            }
          }
          return { ...c, 상태: fixedStatus as Complaint['상태'] };
        });
        setComplaints(sanitized);
      }
    } catch (err) {
      console.error('데이터 로드 중 예외 발생:', err);
    }
  };

  // Supabase에서 객실정보 로드
  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('차수, 호수');

      if (error) {
        // 테이블이 없는 경우 무시
        if (error.code === 'PGRST205') {
          return;
        }
        console.error('객실정보 로드 오류:', error);
        return;
      }

      if (data) {

        // 원본 DB 데이터 구조 확인
        if (data.length > 0) {
        }

        // RoomInfo 타입으로 변환하여 roomDatabase에 동기화
        const roomInfos = data.map((room: any) => ({
          차수: String(room.차수 ?? ''),
          호실: String(room.호수 ?? ''), // 호수 → 호실로 매핑
          입주민: room.임차인 || '', // 임차인을 입주민으로 매핑
          전화번호: room.임차인연락처 || '',
          숙박형태: room.숙박형태 || '',
          타입: room.타입 || '', // 타입 정보 추가
          운영종료일: room.운영종료일 || '',
          이전임차인: room.이전임차인 || '',
          이전임차인연락처: room.이전임차인연락처 || '',
          변경일시: room.변경일시 || '',
        }));

        // roomDatabase 업데이트
        roomDatabase.splice(0, roomDatabase.length, ...roomInfos);
        if (roomInfos.length > 0) {
        }

        setRooms(data as RoomInfo[]);
      }
    } catch (err) {
      console.error('객실정보 로드 중 예외 발생:', err);
    }
  };

  const handleLogin = (userId: string) => {
    setIsLoggedIn(true);
    setCurrentUserId(userId);
    localStorage.setItem('currentUserId', userId);

    // 10번 로그인 시 객실정비 페이지로 이동
    if (userId === '10') {
      setCurrentPage('객실정비');
    }
    // 08번 로그인 시 객실이동 페이지로 이동
    if (userId === '08') {
      setCurrentPage('객실이동');
    }
    // 07번 로그인 시 영선 페이지로 이동
    if (userId === '07') {
      setCurrentPage('영선');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setCurrentUserId('');
    localStorage.removeItem('currentUserId');
  };

  const addComplaint = async (complaint: Omit<Complaint, 'id' | '등록일시' | '등록자'>) => {
    // 객실 정보에서 운영종료일 자동 추가
    const 차수숫자 = complaint.차수.replace(/[^0-9]/g, '');
    const 호실숫자 = complaint.호실.replace(/[^0-9]/g, '');

    const matchedRoom = rooms.find(room => {
      const room차수 = String(room.차수).replace(/[^0-9]/g, '');
      const room호수 = String(room.호수).replace(/[^0-9]/g, '');
      return room차수 === 차수숫자 && room호수 === 호실숫자;
    });

    const newComplaint: Complaint = {
      ...complaint,
      id: Date.now().toString(),
      등록일시: new Date().toISOString(),
      등록자: currentUserId,
      // 매칭되는 객실정보가 있으면 운영종료일 자동 추가
      운영종료일: matchedRoom?.운영종료일 || complaint.운영종료일,
      입주일: matchedRoom?.입차일 || complaint.입주일,
    };

    try {
      // Supabase에 삽입하기 전에 undefined 값을 null로 변환하고 타임스탬프 검증
      const dbComplaint: any = {
        ...newComplaint,
      };

      // 타임스탬프 필드들을 검증하고 undefined는 제거
      const timestampFields = ['연락일', '조치일', '처리일', '완료일시', '운영종료일', '입주일', '청소예정일', '이사일'];
      timestampFields.forEach(field => {
        if (dbComplaint[field] === undefined) {
          delete dbComplaint[field]; // undefined는 제거
        } else if (dbComplaint[field] && typeof dbComplaint[field] === 'string') {
          // 타임스탬프 형식 검증 (ISO 8601 형식 또는 날짜 형식 허용)
          // YYYY-MM-DD 또 YYYY-MM-DDTHH:mm:ss 형식
          const isValidTimestamp = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(dbComplaint[field]);
          if (!isValidTimestamp) {
            console.warn(`⚠️ 잘못된 타임스탬프 형식: ${field} = ${dbComplaint[field]}`);
            delete dbComplaint[field]; // 잘못된 형식은 제거
          }
        }
      });

      const { error } = await supabase
        .from('complaints')
        .insert([dbComplaint]);

      if (error) {
        // 테이블이 없는 경우 로컬 상태로만 작동
        if (error.code === 'PGRST205') {
          setComplaints([newComplaint, ...complaints]);
          return;
        }
        console.error('민원 추가 오류:', error);
        alert('민원 등록 중 오류가 발생했습니다.');
        return;
      }

      setComplaints([newComplaint, ...complaints]);
    } catch (err) {
      console.error('민원 추가 중 예외 발생:', err);
      // 예외 발생 시에도 로컬 상태는 업데이트
      setComplaints([newComplaint, ...complaints]);
    }
  };

  const updateComplaint = async (id: string, updates: Partial<Complaint>) => {

    try {
      const { error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', id);

      if (error) {
        // 테이블이 없는 경우 로컬 상태로만 작동
        if (error.code === 'PGRST205') {
          setComplaints(prevComplaints =>
            prevComplaints.map(c =>
              c.id === id ? { ...c, ...updates } : c
            )
          );
          return;
        }

        // 컬럼이 는 경우 (PGRST204) - 로컬 상태만 업데이트하고 경고 표시
        if (error.code === 'PGRST204') {
          console.warn('⚠️ 데이베이스 컬럼이 없습니다:', error.message);
          console.warn('📌 안내/입력 페이지에서 SQL 마이그레이션을 실행하세요.');

          // 로컬 상태는 업데이트 (UI에는 표시되도록)
          setComplaints(prevComplaints =>
            prevComplaints.map(c =>
              c.id === id ? { ...c, ...updates } : c
            )
          );

          // 퇴실상태나 이사일 업데이트 시에만 한 번만 경고
          if (updates.퇴실상태 || updates.이사일) {
            if (!sessionStorage.getItem('db_migration_warning_shown')) {
              alert('⚠️ 데이터베이스 업데이가 필합니다.\n\n"안내/입력" 페이에서 SQL 마이그레이션을 실행해주세요.\n\n현재는 임시로 화면에만 표시됩니다.');
              sessionStorage.setItem('db_migration_warning_shown', 'true');
            }
          }
          return;
        }

        console.error('민원 수정 오류:', error);
        // 로컬 상태는 업데이트 (컬럼이 없어도 UI에는 표시)
        setComplaints(prevComplaints =>
          prevComplaints.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        );
        return;
      }
      setComplaints(prevComplaints =>
        prevComplaints.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      );
    } catch (err) {
      console.error('민원 수정 중 예외 발생:', err);
      // 예외 발생 시에도 로컬 상태는 업데이트
      setComplaints(prevComplaints =>
        prevComplaints.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      );
    }
  };

  // 호실정보 변경 내역을 '정보변경' 민원으로 기록 (객실히스토리 보존용)
  const logRoomInfoChange = async (
    차수: string,
    호실: string,
    diffs: Array<{ label: string; before?: string | null; after?: string | null }>
  ) => {
    const normalize = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
    const realDiffs = diffs
      .map(d => ({ label: d.label, before: normalize(d.before), after: normalize(d.after) }))
      .filter(d => d.before !== d.after);
    if (realDiffs.length === 0) return;

    const contentLines = realDiffs.map(
      d => `${d.label}: ${d.before || '(없음)'} → ${d.after || '(없음)'}`
    );
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const newComplaint: Complaint = {
      id: uniqueId,
      차수,
      호실,
      구분: '정보변경',
      내용: contentLines.join('\n'),
      조치사항: '',
      상태: '완료',
      등록일시: now,
      완료일시: now,
      등록자: currentUserId || 'system',
    };

    try {
      const { error } = await supabase.from('complaints').insert([newComplaint]);
      if (error && error.code !== 'PGRST205') {
        console.error('정보변경 기록 오류:', error);
      }
    } catch (err) {
      console.error('정보변경 기록 예외:', err);
    }
    setComplaints(prev => [newComplaint, ...prev]);
  };

  // 객실정보 업데이트 함수 추가
  const updateRoom = async (차수: string, 호수: string, updates: Partial<RoomInfo>) => {
    // 정보변경 로그용: 기존 값 스냅샷
    const prevRoom = rooms.find(r =>
      r.차수 == 차수 && (r.호수 == 호수 || (r as any).호실 == 호수)
    );

    try {
      // DB에 upsert로 신규 객실도 생성되게 처리
      const { error } = await supabase
        .from('rooms')
        .upsert({
          차수: parseInt(차수) || 차수,
          호수: parseInt(호수) || 호수,
          ...updates
        }, { onConflict: '차수,호수' });

      if (error) {
        console.warn('⚠️ 객실정보 업데이트 오류:', error);
      } else {
      }

      // 로컬 상태 업데이트 (신규 추가 포함)
      setRooms(prevRooms => {
        const exists = prevRooms.some(r => r.차수 == 차수 && (r.호수 == 호수 || (r as any).호실 == 호수));
        if (exists) {
          return prevRooms.map(r =>
            (r.차수 == 차수 && (r.호수 == 호수 || (r as any).호실 == 호수)) ? { ...r, ...updates } : r
          );
        } else {
          return [...prevRooms, { 차수, 호수, 호실: 호수, ...updates } as RoomInfo];
        }
      });
    } catch (err) {
      console.error('객실정보 수정 중 예외 발생:', err);
      // 예외 발생 시에도 로컬 상태는 업데이트
      setRooms(prevRooms => {
        const exists = prevRooms.some(r => r.차수 == 차수 && (r.호수 == 호수 || (r as any).호실 == 호수));
        if (exists) {
          return prevRooms.map(r =>
            (r.차수 == 차수 && (r.호수 == 호수 || (r as any).호실 == 호수)) ? { ...r, ...updates } : r
          );
        } else {
          return [...prevRooms, { 차수, 호수, 호실: 호수, ...updates } as RoomInfo];
        }
      });
    }

    // 변경 이력 기록 (객실히스토리 보존)
    const diffs: Array<{ label: string; before?: string | null; after?: string | null }> = [];
    if ('숙박형태' in updates) diffs.push({ label: '숙박형태', before: prevRoom?.숙박형태, after: updates.숙박형태 });
    if ('임차인' in updates) diffs.push({ label: '입주민', before: prevRoom?.임차인, after: updates.임차인 });
    if ('임차인연락처' in updates) diffs.push({ label: '연락처', before: prevRoom?.임차인연락처, after: updates.임차인연락처 });
    if ('운영종료일' in updates) diffs.push({ label: '운영종료일', before: prevRoom?.운영종료일, after: updates.운영종료일 });
    if (diffs.length > 0) {
      await logRoomInfoChange(차수, 호수, diffs);
    }
  };

  // 숙박형태 업데이트 함수
  const updateRoomAccommodationType = async (차수: string, 호실: string, 숙박형태: string) => {
    // 정보변경 로그용: 기존 숙박형태 스냅샷
    const 차수전숫자 = String(차수).replace(/[^0-9]/g, '');
    const 호실전숫자 = String(호실).replace(/[^0-9]/g, '');
    const prevRoomForLog = roomDatabase.find(r => {
      const r차수 = String(r.차수 ?? '').replace(/[^0-9]/g, '');
      const r호실 = String(r.호실 ?? '').replace(/[^0-9]/g, '');
      return r차수 === 차수전숫자 && r호실 === 호실전숫자;
    });
    const prev숙박형태 = prevRoomForLog?.숙박형태;

    // 숫자만 추출
    const 차수숫자 = String(차수).replace(/[^0-9]/g, '');
    const 호실숫자 = String(호실).replace(/[^0-9]/g, '');
    if (roomDatabase.length > 0) {
    }

    // 1. roomDatabase 즉시 업데이트 (getRoomInfo가 참조하는 데이터)
    const roomIdx = roomDatabase.findIndex(r => {
      const r차수 = String(r.차수 ?? '').replace(/[^0-9]/g, '');
      const r호실 = String(r.호실 ?? '').replace(/[^0-9]/g, '');
      return r차수 === 차수숫자 && r호실 === 호실숫자;
    });
    if (roomIdx !== -1) {
      roomDatabase[roomIdx] = { ...roomDatabase[roomIdx], 숙박형태 };
    } else {
      console.warn('⚠️ roomDatabase에서 못 찾음 (DB 직접 업데이트 시도):', { 차수숫자, 호실숫자, dbLength: roomDatabase.length });
      // roomDatabase에 없으면 새로 추가 (UI 즉시 반영용)
      roomDatabase.push({
        차수: 차수숫자,
        호실: 호실숫자,
        입주민: '',
        전화번호: '',
        숙박형태,
      });
    }

    // 2. DB 직접 업데이트 - 숫자/문자열 모두 시도
    let dbUpdated = false;
    try {
      // 시도 1: 숫자로 매칭
      const { data: d1, error: e1 } = await supabase
        .from('rooms')
        .update({ 숙박형태 })
        .eq('차수', parseInt(차수숫자))
        .eq('호수', parseInt(호실숫자))
        .select();

      if (!e1 && d1 && d1.length > 0) {
        dbUpdated = true;
      } else {

        // 시도 2: 문자열로 매칭
        const { data: d2, error: e2 } = await supabase
          .from('rooms')
          .update({ 숙박형태 })
          .eq('차수', 차수숫자)
          .eq('호수', 호실숫자)
          .select();

        if (!e2 && d2 && d2.length > 0) {
          dbUpdated = true;
        } else {

          // 시도 3: 원래 값 그대로 매칭
          const { data: d3, error: e3 } = await supabase
            .from('rooms')
            .update({ 숙박형태 })
            .eq('차수', 차수)
            .eq('호수', 호실)
            .select();

          if (!e3 && d3 && d3.length > 0) {
            dbUpdated = true;
          } else {
            // 시도 4: 해당 호실이 rooms 테이블에 없으므로 새로 삽입 (upsert)
            const { data: d4, error: e4 } = await supabase
              .from('rooms')
              .upsert({
                차수: parseInt(차수숫자) || 차수숫자,
                호수: parseInt(호실숫자) || 호실숫자,
                숙박형태,
              }, { onConflict: '차수,호수' })
              .select();

            if (!e4) {
              dbUpdated = true;
            } else {
              // upsert 실패 시 단순 insert 시도
              const { data: d5, error: e5 } = await supabase
                .from('rooms')
                .insert({
                  차수: parseInt(차수숫자) || 차수숫자,
                  호수: parseInt(호실숫자) || 호실숫자,
                  숙박형태,
                })
                .select();

              if (!e5 && d5 && d5.length > 0) {
                dbUpdated = true;
              } else {
                console.warn('⚠️ 모든 DB 매칭/삽입 실패. rooms 테이블 구조를 확인하세요.', e5?.message);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ DB 업데이트 오류:', err);
    }

    // 3. DB 업데이트 후 roomDatabase 재동기화
    if (dbUpdated) {
      await loadRooms();
    }

    // 4. rooms 상태도 업데이트하여 리렌더링 트리거
    setRooms(prevRooms =>
      prevRooms.map(r => {
        const r차수 = String(r.차수 ?? '').replace(/[^0-9]/g, '');
        const r호수 = String((r as any).호수 ?? r.호실 ?? '').replace(/[^0-9]/g, '');
        return (r차수 === 차수숫자 && r호수 === 호실숫자)
          ? { ...r, 숙박형태 }
          : r;
      })
    );

    // 5. 해당 호실의 최신(첫 번째) 민원의 숙박형태 필드도 업데이트 (1번만 변경)
    const latestComplaint = complaints.find(c => {
      const c차수 = c.차수.replace(/[^0-9]/g, '');
      const c호실 = c.호실.replace(/[^0-9]/g, '');
      return c차수 === 차수숫자 && c호실 === 호실숫자;
    });
    if (latestComplaint) {
      await updateComplaint(latestComplaint.id, { 숙박형태 });
    }

    // 6. 변경 이력 기록
    if ((prev숙박형태 || '') !== (숙박형태 || '')) {
      await logRoomInfoChange(차수, 호실, [
        { label: '숙박형태', before: prev숙박형태, after: 숙박형태 }
      ]);
    }
  };

  // 객실이동 데이터 업데이트 함수 (차수+호실 기준)
  const updateRoomMoveData = async (차수: string, 호실: string, updates: Partial<Complaint>) => {
    // 정보변경 로그용: 기존 운영종료일 스냅샷
    const 차수전숫자 = 차수.replace(/[^0-9]/g, '');
    const 호실전숫자 = 호실.replace(/[^0-9]/g, '');
    const prevComplaintForLog = complaints.find(c => {
      const c차수 = c.차수.replace(/[^0-9]/g, '');
      const c호실 = c.호실.replace(/[^0-9]/g, '');
      return c차수 === 차수전숫자 && c호실 === 호실전숫자 && c.운영종료일;
    });
    const prev운영종료일 = prevComplaintForLog?.운영종료일;
    complaints.forEach(c => {
      if (c.운영종료일) {
      }
    });

    // 날짜 유효성 검증 함수
    const isValidDate = (dateString: string | undefined): boolean => {
      if (!dateString) return false;
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    };

    // 1. 차수와 호실을 숫자로 정규화
    const 차수숫자 = 차수.replace(/[^0-9]/g, '');
    const 호실숫자 = 호실.replace(/[^0-9]/g, '');

    // 2. 해당 차수+호실의 운영종료일이 있는 민원 찾기
    const existingComplaint = complaints.find(c => {
      const c차수 = c.차수.replace(/[^0-9]/g, '');
      const c호실 = c.호실.replace(/[^0-9]/g, '');
      const match = c차수 === 차수숫자 && c호실 === 호실숫자 && c.운영종료일;

      if (c.운영종료일) {
      }

      return match;
    });

    if (existingComplaint) {
      // 3-1. 기존 민원이 있으면 업데이트
      await updateComplaint(existingComplaint.id, updates);
    } else {
      // 3-2. 기존 민원이 없으면 새로 생성

      // 해당 차수+호실의 객실정보 기
      const matchedRoom = rooms.find(r => {
        const r차수 = String(r.차수).replace(/[^0-9]/g, '');
        const r호수 = String(r.호수).replace(/[^0-9]/g, '');
        return r차수 === 차수숫자 && r호수 === 호실숫자;
      });

      // 날짜 필드 검증
      const 운영종료일 = isValidDate(matchedRoom?.운영종료일) ? matchedRoom?.운영종료일 : undefined;
      const 입주일 = isValidDate(matchedRoom?.입차일) ? matchedRoom?.입차일 : undefined;
      const 이사일 = isValidDate(updates.이사일) ? updates.이사일 : undefined;

      // 유니크한 ID 생성 (타임스탬프 + 랜덤값)
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newComplaint: Complaint = {
        id: uniqueId,
        차수: 차수,
        호실: 호실,
        구분: '퇴실',
        내용: matchedRoom?.타입 || '객실 퇴실',
        조치사항: matchedRoom?.숙박형태 || '',
        상태: '접수' as const,
        등록일시: new Date().toISOString(),
        등록자: 'system',
        운영종료일: 운영종료일,
        입주일: 입주일,
        퇴실상태: '준비',
        ...updates, // 업데이트 내용 적용
        이사일: 이사일, // 검증된 이사일로 덮어쓰기
      };

      try {
        const { error } = await supabase
          .from('complaints')
          .insert([newComplaint]);

        if (error) {
          if (error.code === 'PGRST205') {
            setComplaints([newComplaint, ...complaints]);
            return;
          }
          console.error('민원 추가 오류:', error);
          setComplaints([newComplaint, ...complaints]);
          return;
        }
        setComplaints([newComplaint, ...complaints]);
      } catch (err) {
        console.error('민원 추가 중 예외 발생:', err);
        setComplaints([newComplaint, ...complaints]);
      }
    }

    // 변경 이력 기록
    if ('운영종료일' in updates && (prev운영종료일 || '') !== (updates.운영종료일 || '')) {
      await logRoomInfoChange(차수, 호실, [
        { label: '운영종료일', before: prev운영종료일, after: updates.운영종료일 }
      ]);
    }
  };

  // 호실 3자 이상 입력 시 자동 조회 트리거됨
  useEffect(() => {
    if (selectedRoom.호실.length >= 3) {
      // 자동 조회 트리거됨
    }
  }, [selectedRoom.호실]);

  const filteredComplaints = complaints.filter(complaint => {
    // 처리상태, 선택사, 날짜필터는 독립적으로 작동 (AND 조건)

    // 처리상태 필터
    if (selectedStatus !== null && complaint.상태 !== selectedStatus) {
      return false;
    }

    // 선택사항 필터
    if (selectedCategory !== null && complaint.구분 !== selectedCategory) {
      return false;
    }

    // 날짜 필터
    if (selectedDateFilter !== null) {
      const isToday = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        return date.toDateString() === today.toDateString();
      };

      const isThisWeek = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return date >= startOfWeek && date <= endOfWeek;
      };

      switch (selectedDateFilter) {
        case '오늘 연락':
          if (complaint.상태 === '접' || !isToday(complaint.등록일시)) return false;
          break;
        case '오늘 조치':
          if (complaint.상태 !== '완료' || !complaint.완료일시 || !isToday(complaint.완료일시)) return false;
          break;
        case '이번주 연락':
          if (complaint.상태 === '접수' || !isThisWeek(complaint.등록일시)) return false;
          break;
        case '이번주 조치':
          if (complaint.상태 !== '완료' || !complaint.완료일시 || !isThisWeek(complaint.완료일시)) return false;
          break;
        case '미연락':
          if (complaint.상태 !== '접수') return false;
          break;
        case '미조치':
          if (complaint.상태 === '완료') return false;
          break;
      }
    }

    return true;
  });

  const roomHistoryComplaints = complaints.filter(c => {
    const room차수 = (c.차수 ?? '').toString().replace(/[^0-9]/g, '');
    const selected차수 = (selectedRoom.차수 ?? '').toString().replace(/[^0-9]/g, '');
    const room호실 = (c.호실 ?? '').toString().replace(/[^0-9]/g, '');
    const selected호실 = (selectedRoom.호실 ?? '').toString().replace(/[^0-9]/g, '');
    return (!selectedRoom.차수 || room차수 === selected차수) &&
      (!selectedRoom.호실 || room호실 === selected호실);
  });

  const stats = {
    전체: complaints.length,
    접수: complaints.filter(c => c.상태 === '접수').length,
    처리중: complaints.filter(c => c.상태 === '처리중' || c.상태 === '진행중').length,
    영선이관: complaints.filter(c => c.상태 === '영선이관' || c.상태 === '영선팀' || c.상태 === '부서이관').length,
    외부업체: complaints.filter(c => c.상태 === '외부업체').length,
    완료: complaints.filter(c => c.상태 === '완료').length
  };

  const categories = {
    '영선': complaints.filter(c => c.구분 === '영선').length,
    'CS': complaints.filter(c => c.구분 === 'CS').length,
    '입실': complaints.filter(c => c.구분 === '입실').length,
    '퇴실': complaints.filter(c => c.구분 === '퇴실').length,
    '청소': complaints.filter(c => c.구분 === '청소').length,
  };

  // 양방향 바인딩 핸들러
  const handleFormRoomChange = (room: { 차수: string; 호실: string }) => {
    setFormRoom(room);
    setSelectedRoom(room);
  };

  const handleHistoryRoomChange = (room: { 차수: string; 호실: string }) => {
    setSelectedRoom(room);
    setFormRoom(room);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // 전체화면 이미지 모달
  if (fullscreenImage) {
    return (
      <div
        className="fixed inset-0 bg-black z-50 flex items-center justify-center cursor-pointer"
        onClick={() => setFullscreenImage(null)}
      >
        <div className="absolute top-4 left-4 bg-white/10 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm pointer-events-none">
          이미지를 클릭하면 돌아갑니다
        </div>
        <img
          src={fullscreenImage}
          alt="전체화면"
          className="max-w-[90vw] max-h-[90vh] object-contain"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo className="h-16" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">BLUECARE</h1>
                <p className="text-blue-200 text-sm md:text-base">블루오션 레지던스 호텔 민원관리 시스템</p>
              </div>
            </div>

            {/* 우측 영역 */}
            <div className="flex items-center gap-3">
              {/* 사용자 및 로그아웃 */}
              <div className="flex items-center gap-2">
                <span className="text-blue-100 text-xs whitespace-nowrap">
                  {currentUserId === '01' ? '수용' :
                    currentUserId === '02' ? '동훈' :
                      currentUserId === '03' ? '아름' :
                        currentUserId === '04' ? '태형' :
                          currentUserId === '05' ? '아름(매니저)' :
                            currentUserId === '06' ? '남식' :
                              currentUserId === '07' ? '영선' :
                                currentUserId === '08' ? '관리사무소' :
                                  currentUserId === '09' ? '키핑' :
                                    currentUserId === '10' ? '키핑팀' : ''}님
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors whitespace-nowrap"
                >
                  로그아웃
                </button>
              </div>

              {/* 관리자 + M01, M02, M03 버튼 (01번: 관리자·태형·아름·동훈 동일 스타일) */}
              {(currentUserId === '01' || (currentUserId !== '10' && currentUserId !== '08' && currentUserId !== '07')) && (
                <div className="flex gap-1 border-l border-blue-400/30 pl-3">
                  {currentUserId === '01' && (
                    <button
                      onClick={() => setCurrentPage('관리자')}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${currentPage === '관리자'
                        ? 'bg-white text-blue-600'
                        : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                      관리자
                    </button>
                  )}
                  {currentUserId !== '10' && currentUserId !== '08' && currentUserId !== '07' && (
                    (['M03', 'M02', 'M01', 'M04'] as const).map((page) => {
                      const label = page === 'M03' ? '태형' : page === 'M02' ? '아름' : page === 'M01' ? '동훈' : '지원';
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${currentPage === page
                            ? 'bg-white text-blue-600'
                            : 'bg-white/10 text-white hover:bg-white/20'
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2 border-t border-blue-500/30">
          <div className="flex gap-2 overflow-x-auto">
            {(currentUserId === '10'
              ? ['객실정비']
              : currentUserId === '08'
                ? ['객실이동']
                : currentUserId === '07'
                  ? ['영선']
                  : ['입력', '전체조회', '영선', '객실이동', '객실체크', '객실정비', '숙박형태', '객실히스토리', '안내/입력']
            ).map((page) => {
              const Icon = PAGE_ICONS[page];
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as typeof currentPage)}
                  className={`px-5 py-2.5 text-base font-medium whitespace-nowrap transition-all rounded-lg flex items-center gap-1.5 ${currentPage === page
                    ? 'text-white bg-blue-600 shadow-sm'
                    : 'text-blue-100 hover:text-white hover:bg-blue-600/40'
                    }`}
                >
                  {Icon && <Icon className="w-4 h-4 shrink-0" />}
                  {page}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-3 sm:px-4 lg:px-6 py-4">
        <ErrorBoundary
          key={currentPage}
          fallback={(error, reset) => (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-amber-800 font-medium mb-2">페이지를 불러오는 중 문제가 발생했습니다.</p>
              <p className="text-sm text-amber-700 mb-2">아래 버튼으로 다른 메뉴로 이동하거나, 위 탭을 눌러 주세요.</p>
              <details className="text-left text-xs text-amber-900 bg-amber-100 rounded p-2 mb-3 whitespace-pre-wrap break-words">
                <summary className="cursor-pointer font-medium">오류 상세 보기</summary>
                <div className="mt-2">{error.message}</div>
                {error.stack && <pre className="mt-2 overflow-auto max-h-64">{error.stack}</pre>}
              </details>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    const first = currentUserId === '10' ? '객실정비' : currentUserId === '08' ? '객실이동' : currentUserId === '07' ? '영선' : '전체조회';
                    setCurrentPage(first as typeof currentPage);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  다른 메뉴로 이동
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
        >
          {currentPage === '입력' && (
            <InputPage
              onSubmit={addComplaint}
              selectedRoom={selectedRoom}
              onRoomChange={handleHistoryRoomChange}
              formRoom={formRoom}
              onFormRoomChange={handleFormRoomChange}
              roomHistoryComplaints={roomHistoryComplaints}
              onUpdate={updateComplaint}
              onImageClick={setFullscreenImage}
              onRoomAccommodationTypeUpdate={updateRoomAccommodationType}
              formRoomAccommodationType={rooms.find(r => r.차수 === formRoom.차수 && r.호수 === formRoom.호실)?.숙박형태}
              onRoomUpdate={updateRoom}
              onNavigateToHistory={() => setCurrentPage('객실히스토리')}
            />
          )}

          {currentPage === '전체조회' && (
            <AllComplaintsPage
              stats={stats}
              categories={categories}
              selectedStatus={selectedStatus}
              selectedCategory={selectedCategory}
              selectedDateFilter={selectedDateFilter}
              onStatusSelect={setSelectedStatus}
              onCategorySelect={setSelectedCategory}
              onDateFilterSelect={setSelectedDateFilter}
              complaints={complaints}
              filteredComplaints={filteredComplaints}
              onUpdate={updateComplaint}
              onImageClick={setFullscreenImage}
            />
          )}

          {currentPage === '영선' && (
            <MaintenancePage
              complaints={complaints}
              onUpdate={updateComplaint}
              onImageClick={setFullscreenImage}
            />
          )}

          {currentPage === '객실이동' && (
            <RoomMovePage
              complaints={complaints}
              rooms={rooms}
              onUpdate={updateComplaint}
              onRoomUpdate={updateRoom}
              onRoomMoveDataUpdate={updateRoomMoveData}
              onImageClick={setFullscreenImage}
            />
          )}

          {currentPage === '객실체크' && (
            <RoomCheckPage
              complaints={complaints}
              onUpdate={updateComplaint}
              onSelectRoom={(complaint) => {
                // TODO: 세부 체크리스트 페이지로 이동
              }}
              currentUserId={currentUserId}
            />
          )}

          {currentPage === '객실정비' && (
            <CleaningPage
              complaints={complaints}
              onUpdate={updateComplaint}
              onImageClick={setFullscreenImage}
              currentUserId={currentUserId}
              rooms={rooms}
            />
          )}

          {currentPage === '안내/입력' && (
            <InfoPage onRoomsUpdate={loadRooms} currentUserId={currentUserId} />
          )}

          {currentPage === 'M01' && (
            <M01Page
              complaints={complaints}
              rooms={rooms}
              onUpdate={updateComplaint}
            />
          )}

          {currentPage === 'M02' && (
            <M02Page
              complaints={complaints}
              rooms={rooms}
              onUpdate={updateComplaint}
            />
          )}

          {currentPage === 'M03' && (
            <M03Page
              complaints={complaints}
              rooms={rooms}
              onUpdate={updateComplaint}
            />
          )}

          {currentPage === 'M04' && (
            <M04Page
              complaints={complaints}
              rooms={rooms}
              onUpdate={updateComplaint}
            />
          )}

          {currentPage === '숙박형태' && (
            <AccommodationTypePage
              rooms={rooms}
              onNavigateToInput={() => setCurrentPage('입력')}
            />
          )}

          {currentPage === '객실히스토리' && (
            <RoomHistoryPage
              complaints={complaints}
              rooms={rooms}
              onUpdate={updateComplaint}
              onImageClick={setFullscreenImage}
              selectedRoom={selectedRoom}
              onRoomUpdate={updateRoom}
              onRoomChange={(room) => {
                setSelectedRoom(room);
                setFormRoom(room);
              }}
              onNavigateToInput={() => setCurrentPage('입력')}
            />
          )}

          {currentPage === '관리자' && currentUserId === '01' && (
            <AdminDashboard complaints={complaints} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}