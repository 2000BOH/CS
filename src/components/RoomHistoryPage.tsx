import { useState, useMemo, useEffect, useRef } from 'react';
import { Home, Clock, User, ChevronDown, ChevronUp, CheckCircle2, Edit2 } from 'lucide-react';
import type { Complaint, RoomInfo } from '../types';
import { getRoomInfo, roomDatabase } from '../data/roomData';
import { formatShortDate, formatDateTime } from '../utils/dateFormat';

interface RoomHistoryPageProps {
  complaints: Complaint[];
  rooms: RoomInfo[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  onRoomUpdate?: (차수: string, 호수: string, updates: Partial<RoomInfo>) => void;
  onImageClick: (url: string) => void;
  selectedRoom?: { 차수: string; 호실: string };
  onRoomChange?: (room: { 차수: string; 호실: string }) => void;
  onNavigateToInput?: () => void;
}

const USER_MAP: Record<string, string> = {
  '01': '수용', '02': '동훈', '03': '시우',
  '04': '현석', '05': '아름', '06': '남식',
  '07': '영선', '08': '관리사무소', '09': '키핑',
  '10': '키핑팀', 'system': '시스템',
};
const getUserName = (id: string) => USER_MAP[id] || id;

// ── 3가지 타입 판별 ────────────────────────────────────────────────────────
// 신규 : 접수 상태이고 조치사항 없음 → 처음 등록된 그대로
// 추가 : 조치사항이 입력됐지만 완료는 아님
// 변경 : 상태가 완료이거나 완료일시가 있음
type CardType = '신규' | '추가' | '변경';

function getCardType(c: Complaint): CardType {
  if (c.상태 === '완료' || !!c.완료일시) return '변경';
  if (c.조치사항) return '추가';
  return '신규';
}

// 타입별 스타일 정의 (파스텔 톤)
const TYPE_STYLE: Record<CardType, {
  headerBg: string;
  headerText: string;
  headerBorder: string;
  cardBg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  dateLabel: string;
}> = {
  '신규': {
    headerBg: 'bg-blue-100',
    headerText: 'text-blue-700',
    headerBorder: 'border-b border-blue-200',
    cardBg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-200',
    badgeText: 'text-blue-800',
    dateLabel: '입력일',
  },
  '추가': {
    headerBg: 'bg-amber-100',
    headerText: 'text-amber-700',
    headerBorder: 'border-b border-amber-200',
    cardBg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-200',
    badgeText: 'text-amber-800',
    dateLabel: '추가일',
  },
  '변경': {
    headerBg: 'bg-green-100',
    headerText: 'text-green-700',
    headerBorder: 'border-b border-green-200',
    cardBg: 'bg-green-50',
    border: 'border-green-200',
    badgeBg: 'bg-green-200',
    badgeText: 'text-green-800',
    dateLabel: '변경일',
  },
};

// 타입별 표시할 날짜 선택
function getDisplayDate(c: Complaint, type: CardType): string {
  if (type === '변경') return c.완료일시 || c.조치일 || c.등록일시;
  if (type === '추가') return c.조치일 || c.연락일 || c.등록일시;
  return c.등록일시;
}

// 타입별 표시할 내용 선택
function getDisplayContent(c: Complaint, type: CardType): string {
  if (type === '변경') return c.조치사항 || c.내용 || '';
  if (type === '추가') return c.조치사항 || c.내용 || '';
  return c.내용 || '';
}

const STATUS_COLOR: Record<string, string> = {
  '접수': 'bg-blue-100 text-blue-700 border border-blue-200',
  '영선': 'bg-teal-100 text-teal-700 border border-teal-200',
  '외부업체': 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  '청소': 'bg-sky-100 text-sky-700 border border-sky-200',
  '퇴실': 'bg-amber-100 text-amber-700 border border-amber-200',
  '완료': 'bg-green-100 text-green-700 border border-green-200',
};

const FILTER_OPTIONS = [
  { key: '', label: '전체' },
  { key: 'CS', label: 'CS' },
  { key: '영선', label: '영선' },
  { key: '입실', label: '입실' },
  { key: '퇴실', label: '퇴실' },
  { key: '청소', label: '청소' },
];

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export function RoomHistoryPage({ complaints, rooms, onUpdate, onRoomUpdate, onImageClick, selectedRoom, onRoomChange, onNavigateToInput }: RoomHistoryPageProps) {
  const [차수Input, set차수Input] = useState('');
  const [호실Input, set호실Input] = useState('');
  const [searched, setSearched] = useState(false);
  const [search차수, setSearch차수] = useState('');
  const [search호실, setSearch호실] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS = 30; // 3열 × 10행
  const 호실InputRef = useRef<HTMLInputElement>(null);
  const skipSyncRef = useRef(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [editRoomData, setEditRoomData] = useState({ 운영종료일: '', 숙박형태: '', 입주민: '', 전화번호: '' });

  // 입력 페이지에서 차수/호실이 변경되면 히스토리 페이지에도 반영
  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    if (!selectedRoom) return;
    const 차수 = selectedRoom.차수.replace(/[^0-9]/g, '');
    const 호실 = selectedRoom.호실.replace(/[^0-9]/g, '');
    if (!호실) return;
    set차수Input(차수);
    set호실Input(호실);
    setSearch차수(차수);
    setSearch호실(호실);
    setSearched(true);
    setExpandedId(null);
    setFilterKey('');
    setCurrentPage(1);
  }, [selectedRoom?.차수, selectedRoom?.호실]);

  // 호실 3자리 이상 입력 시 자동 검색 (입력 페이지와 동일)
  useEffect(() => {
    const 차수 = 차수Input.replace(/[^0-9]/g, '');
    const 호실 = 호실Input.replace(/[^0-9]/g, '');
    if (호실.length >= 3) {
      setSearch차수(차수);
      setSearch호실(호실);
      setSearched(true);
      setExpandedId(null);
      setFilterKey('');
      setCurrentPage(1);
      if (onRoomChange) onRoomChange({ 차수: 차수Input, 호실: 호실Input });
    } else {
      setSearched(false);
    }
  }, [차수Input, 호실Input]);


  const allSorted = useMemo(() => {
    if (!searched || !search호실) return [];
    return complaints
      .filter(c => {
        const c차 = c.차수.replace(/[^0-9]/g, '');
        const c호 = c.호실.replace(/[^0-9]/g, '');
        return (!search차수 || c차 === search차수) && c호 === search호실;
      })
      .sort((a, b) => new Date(a.등록일시).getTime() - new Date(b.등록일시).getTime());
  }, [complaints, search차수, search호실, searched]);

  const filtered = useMemo(() =>
    filterKey ? allSorted.filter(c => c.구분 === filterKey) : allSorted,
    [allSorted, filterKey]);

  // 최신이 맨 위, 번호는 오래된=1
  const displayList = useMemo(() => [...filtered].reverse(), [filtered]);
  const totalPages = Math.ceil(displayList.length / ITEMS);
  const paginated = displayList.slice((currentPage - 1) * ITEMS, currentPage * ITEMS);

  const roomInfo = getRoomInfo(search차수, search호실);
  const roomFromDB = useMemo(() => {
    if (!search호실) return null;
    return rooms.find(r => {
      const r차 = String(r.차수).replace(/[^0-9]/g, '');
      const r호 = String((r as any).호수 || '').replace(/[^0-9]/g, '');
      return (!search차수 || r차 === search차수) && r호 === search호실;
    });
  }, [rooms, search차수, search호실]);
  const displayRoom = roomInfo || roomFromDB;
  const showHistory = searched && !!search호실;

  const handleStatusChange = (id: string, st: Complaint['상태']) => {
    onUpdate(id, { 상태: st, ...(st === '완료' ? { 완료일시: new Date().toISOString() } : {}) });
  };

  return (
    <div className="space-y-4">

      {/* ── 검색 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-blue-600" /> 객실 히스토리 조회
        </h2>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">차수</label>
            <input type="text" value={차수Input}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                set차수Input(v);
                if (v.length === 1) setTimeout(() => 호실InputRef.current?.focus(), 0);
              }}
              onFocus={() => { skipSyncRef.current = true; set차수Input(''); }}
              placeholder="예: 1"
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">호실</label>
            <input ref={호실InputRef} type="text" value={호실Input}
              onChange={e => set호실Input(e.target.value.replace(/[^0-9]/g, ''))}
              onFocus={() => { skipSyncRef.current = true; set호실Input(''); }}
              placeholder="3자리 이상 입력 시 자동 검색 (예: 101)"
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {showHistory && displayRoom && (
            isEditingRoom ? (
              <div className="bg-blue-50 border border-blue-300 rounded-lg px-4 py-3 text-sm space-y-2 flex-1 w-full mt-2">
                <div className="flex items-end gap-x-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium">숙박형태</label>
                    <select
                      className="w-32 text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editRoomData.숙박형태}
                      onChange={e => setEditRoomData({ ...editRoomData, 숙박형태: e.target.value })}
                    >
                      <option value="">선택</option>
                      {['인스파이어', '장박_개인', '장박_법인', '호텔', '기숙사', '입실예정', '계약만료', '공실 보수중', '사용금지', '퇴실'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium">입주민</label>
                    <input
                      className="w-28 text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editRoomData.입주민}
                      onChange={e => setEditRoomData({ ...editRoomData, 입주민: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium">연락처</label>
                    <input
                      className="w-32 text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editRoomData.전화번호}
                      onChange={e => setEditRoomData({ ...editRoomData, 전화번호: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium">운영종료일</label>
                    <input
                      type="date"
                      className="w-36 text-xs px-2 py-1.5 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editRoomData.운영종료일}
                      onChange={e => setEditRoomData({ ...editRoomData, 운영종료일: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (onRoomUpdate && search차수 && search호실) {
                          onRoomUpdate(search차수, search호실, { 숙박형태: editRoomData.숙박형태, 임차인: editRoomData.입주민, 임차인연락처: editRoomData.전화번호, 운영종료일: editRoomData.운영종료일 });
                          const roomIdx = roomDatabase.findIndex((r: any) => { const r차수 = String(r.차수 ?? '').replace(/[^0-9]/g, ''); const r호실 = String(r.호실 ?? '').replace(/[^0-9]/g, ''); return r차수 === search차수 && r호실 === search호실; });
                          if (roomIdx !== -1) { roomDatabase[roomIdx] = { ...roomDatabase[roomIdx], 숙박형태: editRoomData.숙박형태, 입주민: editRoomData.입주민, 전화번호: editRoomData.전화번호, 운영종료일: editRoomData.운영종료일 }; } else { roomDatabase.push({ 차수: search차수, 호실: search호실, 숙박형태: editRoomData.숙박형태, 입주민: editRoomData.입주민, 전화번호: editRoomData.전화번호, 운영종료일: editRoomData.운영종료일 }); }
                        }
                        setIsEditingRoom(false);
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setIsEditingRoom(false)}
                      className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm relative group pr-20 mt-2 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => {
                  setEditRoomData({
                    숙박형태: displayRoom.숙박형태 || '',
                    입주민: displayRoom.입주민 || (roomFromDB as any)?.임차인 || '',
                    전화번호: displayRoom.전화번호 || (roomFromDB as any)?.임차인연락처 || '',
                    운영종료일: displayRoom.운영종료일 || ''
                  });
                  setIsEditingRoom(true);
                }}
              >
                <span className="text-gray-400 text-xs">숙박형태</span>
                <span className="font-bold text-blue-700">{displayRoom.숙박형태 || '-'}</span>
                <span className="text-gray-300">│</span>
                <span className="text-gray-400 text-xs">입주민</span>
                <span className="font-semibold text-gray-800">{displayRoom.입주민 || (roomFromDB as any)?.임차인 || '-'}</span>
                <span className="text-gray-300">│</span>
                <span className="text-gray-400 text-xs">연락처</span>
                {(displayRoom.전화번호 || (roomFromDB as any)?.임차인연락처)
                  ? <a href={`tel:${displayRoom.전화번호 || (roomFromDB as any)?.임차인연락처}`}
                    className="font-semibold text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}>
                    {displayRoom.전화번호 || (roomFromDB as any)?.임차인연락처}
                  </a>
                  : <span className="text-gray-400">-</span>}
                {displayRoom.운영종료일 && (
                  <>
                    <span className="text-gray-300">│</span>
                    <span className="text-gray-400 text-xs">운영종료일</span>
                    <span className="font-semibold text-red-600">{displayRoom.운영종료일}</span>
                  </>
                )}

                <button
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-medium bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100 shadow-sm flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> 정보수정
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── 결과 ── */}
      {
        showHistory && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">

            {/* 필터 + 범례 + 건수 */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* 구분 필터 */}
                {FILTER_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => { setFilterKey(opt.key); setCurrentPage(1); }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filterKey === opt.key
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                      }`}>
                    {opt.label}
                  </button>
                ))}
                <span className="text-gray-300 mx-1">│</span>
                {/* 범례 */}
                {(['신규', '추가', '변경'] as CardType[]).map(t => (
                  <span key={t} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${TYPE_STYLE[t].headerBg} ${TYPE_STYLE[t].headerText} ${TYPE_STYLE[t].headerBorder}`}>
                    {t}
                  </span>
                ))}
                {onNavigateToInput && (
                  <>
                    <span className="text-gray-300 mx-1">│</span>
                    <button
                      type="button"
                      onClick={onNavigateToInput}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      입력페이지
                    </button>
                  </>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {search차수}차 {search호실}호 &middot; <span className="font-bold text-gray-800">{filtered.length}</span>건
              </span>
            </div>

            {displayList.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">해당 객실의 이력이 없습니다.</div>
            ) : (
              <>
                {/* ── 3열 고정 그리드 ── */}
                <div className="grid grid-cols-3 gap-2">
                  {paginated.map((complaint) => {
                    const no = filtered.length - displayList.indexOf(complaint);
                    const isExpanded = expandedId === complaint.id;
                    const type = getCardType(complaint);
                    const style = TYPE_STYLE[type];
                    const displayDate = getDisplayDate(complaint, type);
                    const displayContent = getDisplayContent(complaint, type);

                    return (
                      <div key={complaint.id}
                        className={`rounded-xl border overflow-hidden shadow-sm transition-all ${style.border} ${isExpanded ? 'ring-2 ring-blue-400' : ''
                          }`}>

                        {/* ══ 카드 본문 — 한 줄 ══ */}
                        <div
                          className={`flex items-center gap-2 px-4 py-3 cursor-pointer ${style.cardBg}`}
                          onClick={() => setExpandedId(isExpanded ? null : complaint.id)}>

                          {/* 번호 */}
                          <span className="flex-shrink-0 text-sm font-bold text-gray-400 w-8">#{no}</span>

                          {/* 타입 뱃지 */}
                          <span className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-bold leading-none ${style.badgeBg} ${style.badgeText}`}>
                            {type}
                          </span>

                          {/* 날짜 */}
                          <span className="flex-shrink-0 flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            {formatShortDate(displayDate)}
                          </span>

                          {/* 인원 */}
                          <span className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold text-gray-700">
                            <User className="w-4 h-4 text-gray-400" />
                            {getUserName(complaint.등록자)}
                          </span>

                          {/* 구분 */}
                          {complaint.구분 && (
                            <span className="flex-shrink-0 px-3 py-1.5 rounded-md bg-white border border-gray-300 text-gray-600 text-sm font-medium leading-none">
                              {complaint.구분}
                            </span>
                          )}

                          {/* 상태 */}
                          <span className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-semibold leading-none ${STATUS_COLOR[complaint.상태] || 'bg-gray-100 text-gray-600'}`}>
                            {complaint.상태}
                          </span>

                          {/* 내용 — 남은 공간 채움 */}
                          <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">
                            {displayContent || <span className="text-gray-300 italic text-sm">내용 없음</span>}
                          </span>

                          {/* 사진 */}
                          {complaint.사진 && complaint.사진.length > 0 && (
                            <div className="flex-shrink-0 flex gap-1">
                              {complaint.사진.slice(0, 2).map((img, idx) => (
                                <img key={idx} src={img} alt={`사진 ${idx + 1}`}
                                  className="w-8 h-8 object-cover rounded border border-gray-300 cursor-pointer hover:border-blue-400"
                                  onClick={e => { e.stopPropagation(); onImageClick(img); }} />
                              ))}
                            </div>
                          )}

                          {/* 펼치기 */}
                          <span className="flex-shrink-0 text-gray-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>

                        {/* 확장 패널 wrapper */}
                        <div>

                          {/* ── 확장: 수정 패널 ── */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 px-3 py-3 bg-white space-y-2"
                              onClick={e => e.stopPropagation()}>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">접수 내용</label>
                                <textarea
                                  key={`edit-content-${complaint.id}`}
                                  defaultValue={complaint.내용}
                                  onBlur={e => { if (e.target.value !== complaint.내용) onUpdate(complaint.id, { 내용: e.target.value }); }}
                                  rows={2}
                                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">조치사항</label>
                                <textarea
                                  key={`edit-action-${complaint.id}`}
                                  defaultValue={complaint.조치사항 || ''}
                                  onBlur={e => { if (e.target.value !== (complaint.조치사항 || '')) onUpdate(complaint.id, { 조치사항: e.target.value }); }}
                                  placeholder="조치 내용 입력"
                                  rows={2}
                                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">처리상태</label>
                                <div className="flex gap-1 flex-wrap">
                                  {(['접수', '영선', '외부업체', '청소', '퇴실', '완료'] as const).map(st => (
                                    <button key={st} onClick={() => handleStatusChange(complaint.id, st)}
                                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${complaint.상태 === st
                                        ? st === '접수' ? 'bg-blue-600 text-white'
                                          : st === '영선' ? 'bg-teal-600 text-white'
                                            : st === '외부업체' ? 'bg-indigo-600 text-white'
                                              : st === '청소' ? 'bg-sky-600 text-white'
                                                : st === '퇴실' ? 'bg-amber-600 text-white'
                                                  : 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}>
                                      {st}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {complaint.완료일시 && (
                                <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium pt-1 border-t border-gray-100">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  완료: {formatDateTime(complaint.완료일시)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100">이전</button>
                    <span className="text-xs text-gray-600">{currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100">다음</button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      }
    </div >
  );
}
