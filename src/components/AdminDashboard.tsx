import { useState, useMemo, useEffect } from 'react';
import { format, isToday, isYesterday, isTomorrow, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, Users, ClipboardList, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { Complaint } from '../types';
import { supabase } from '../utils/supabase/client';

interface AdminDashboardProps {
  complaints: Complaint[];
}

// 직원 정보
const STAFF = [
  { id: 'all', name: '전체', color: 'bg-gray-500', light: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700' },
  { id: '태형', name: '태형', color: 'bg-green-600', light: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  { id: '아름', name: '아름', color: 'bg-purple-600', light: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  { id: '동훈', name: '동훈', color: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
];

// 등록자 ID → 이름 매핑
const ID_TO_NAME: Record<string, string> = {
  '01': '수용', '02': '동훈', '03': '아름', '04': '태형',
  '05': '아름(매니저)', '06': '남식', '07': '영선', '08': '관리사무소',
  '09': '키핑', '10': '키핑팀',
};

// M0x 담당자 매핑
const M_STAFF: Record<string, string> = {
  M01: '동훈', M02: '아름', M03: '태형',
};

type DateRange = '오늘' | '어제' | '내일' | '이번주' | '직접입력';

function getDateRange(range: DateRange, customDate: string): { from: Date; to: Date } | null {
  const now = new Date();
  if (range === '오늘') return { from: startOfDay(now), to: endOfDay(now) };
  if (range === '어제') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return { from: startOfDay(d), to: endOfDay(d) };
  }
  if (range === '내일') {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return { from: startOfDay(d), to: endOfDay(d) };
  }
  if (range === '이번주') {
    const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { from: startOfDay(mon), to: endOfDay(sun) };
  }
  if (range === '직접입력' && customDate) {
    const d = parseISO(customDate);
    return { from: startOfDay(d), to: endOfDay(d) };
  }
  return null;
}

function fmtDate(iso?: string) {
  if (!iso) return '-';
  try { return format(parseISO(iso), 'yy.MM.dd HH:mm', { locale: ko }); } catch { return '-'; }
}

function fmtShort(iso?: string) {
  if (!iso) return '-';
  try { return format(parseISO(iso), 'yy.MM.dd', { locale: ko }); } catch { return '-'; }
}

// 상태 뱃지 색상
function statusColor(s: string) {
  const m: Record<string, string> = {
    '접수': 'bg-gray-100 text-gray-700',
    '진행중': 'bg-blue-100 text-blue-700',
    '영선팀': 'bg-yellow-100 text-yellow-700',
    '부서이관': 'bg-orange-100 text-orange-700',
    '외부업체': 'bg-red-100 text-red-700',
    '완료': 'bg-green-100 text-green-700',
  };
  return m[s] || 'bg-gray-100 text-gray-600';
}

export function AdminDashboard({ complaints }: AdminDashboardProps) {
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('오늘');
  const [customDate, setCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'업무일지' | '담당자확인' | '완료현황'>('업무일지');
  const [staffNotes, setStaffNotes] = useState<Record<string, { 중요사항: string; 특이사항: string }>>({ '04': { 중요사항: '', 특이사항: '' }, '03': { 중요사항: '', 특이사항: '' }, '02': { 중요사항: '', 특이사항: '' } });

  const range = useMemo(() => getDateRange(dateRange, customDate), [dateRange, customDate]);

  const notesDisplayDate = useMemo(() => {
    if (!range) return format(new Date(), 'yyyy-MM-dd');
    return format(range.from, 'yyyy-MM-dd');
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('staff_daily_notes')
        .select('staff_id, 중요사항, 특이사항')
        .eq('note_date', notesDisplayDate)
        .in('staff_id', ['02', '03', '04']);
      if (cancelled) return;
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) return;
        return;
      }
      const next: Record<string, { 중요사항: string; 특이사항: string }> = { '04': { 중요사항: '', 특이사항: '' }, '03': { 중요사항: '', 특이사항: '' }, '02': { 중요사항: '', 특이사항: '' } };
      (data || []).forEach((row: any) => {
        next[row.staff_id] = { 중요사항: row.중요사항 || '', 특이사항: row.특이사항 || '' };
      });
      setStaffNotes(next);
    })();
    return () => { cancelled = true; };
  }, [notesDisplayDate]);

  // 날짜 범위 내에 있는지 체크 (여러 날짜 필드 중 하나라도 해당하면 포함)
  const inRange = (c: Complaint) => {
    if (!range) return true;
    const dates = [c.등록일시, c.완료일시, c.조치일, c.처리일, c.이사일, c.청소예정일].filter(Boolean) as string[];
    return dates.some(d => {
      try { return isWithinInterval(parseISO(d), range); } catch { return false; }
    });
  };

  // 직원 필터 — 등록자 이름 또는 M0x 담당자확인 여부로 판단
  const byStaff = (c: Complaint, staff: string): boolean => {
    if (staff === 'all') return true;
    const registrantName = ID_TO_NAME[c.등록자] || c.등록자;
    if (registrantName === staff) return true;
    // M0x 담당자확인 여부
    if (staff === '태형' && c.담당자확인_M03) return true;
    if (staff === '아름' && c.담당자확인_M02) return true;
    if (staff === '동훈' && c.담당자확인_M01) return true;
    return false;
  };

  // 필터된 민원
  const filtered = useMemo(() =>
    complaints.filter(c => inRange(c) && byStaff(c, selectedStaff)),
    [complaints, range, selectedStaff]
  );

  // 담당자확인 항목 (M01~M03)
  const confirmedItems = useMemo(() => {
    return complaints.filter(c => {
      if (!inRange(c)) return false;
      if (selectedStaff === 'all') return c.담당자확인_M01 || c.담당자확인_M02 || c.담당자확인_M03;
      if (selectedStaff === '태형') return c.담당자확인_M03;
      if (selectedStaff === '아름') return c.담당자확인_M02;
      if (selectedStaff === '동훈') return c.담당자확인_M01;
      return false;
    });
  }, [complaints, range, selectedStaff]);

  // 완료 항목
  const completedItems = useMemo(() =>
    complaints.filter(c => {
      if (c.상태 !== '완료') return false;
      if (!c.완료일시) return false;
      try {
        if (range && !isWithinInterval(parseISO(c.완료일시), range)) return false;
      } catch { return false; }
      return byStaff(c, selectedStaff);
    }),
    [complaints, range, selectedStaff]
  );

  // 직원별 요약 통계
  const staffSummary = useMemo(() => {
    return STAFF.filter(s => s.id !== 'all').map(s => {
      const items = complaints.filter(c => inRange(c) && byStaff(c, s.id));
      const done = items.filter(c => c.상태 === '완료').length;
      const confirmed = complaints.filter(c => inRange(c) && (
        (s.id === '태형' && c.담당자확인_M03) ||
        (s.id === '아름' && c.담당자확인_M02) ||
        (s.id === '동훈' && c.담당자확인_M01)
      )).length;
      return { ...s, total: items.length, done, confirmed };
    });
  }, [complaints, range]);

  const dateLabel = () => {
    if (dateRange === '직접입력' && customDate) return fmtShort(customDate + 'T00:00:00');
    return dateRange;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList className="w-8 h-8 text-black" />
          <h1 className="text-2xl font-bold text-black">관리자 업무일지</h1>
        </div>
        <p className="text-slate-100 text-sm">태형 · 아름 · 동훈 업무 현황 모니터링</p>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* 날짜 필터 */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">날짜</span>
          </div>
          {(['오늘', '어제', '내일', '이번주', '직접입력'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dateRange === r
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {r}
            </button>
          ))}
          {dateRange === '직접입력' && (
            <input
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          )}

          {/* 구분선 */}
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 직원 필터 */}
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">인원</span>
          </div>
          {STAFF.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStaff(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedStaff === s.id
                  ? `${s.color} text-white`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 태형 · 아름 · 동훈 일일 메모 (선택한 날짜 기준) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          일일 메모 — {format(parseISO(notesDisplayDate + 'T00:00:00'), 'yyyy년 M월 d일 (E)', { locale: ko })}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: '04', name: '태형', border: 'border-green-200', bg: 'bg-green-50' },
            { id: '03', name: '아름', border: 'border-purple-200', bg: 'bg-purple-50' },
            { id: '02', name: '동훈', border: 'border-blue-200', bg: 'bg-blue-50' },
          ].map(({ id, name, border, bg }) => (
            <div key={id} className={`rounded-lg border-2 ${border} ${bg} p-3`}>
              <div className="font-bold text-gray-900 text-sm mb-2">{name}</div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-gray-500 font-medium">중요사항</span>
                  <p className="mt-0.5 text-gray-800 whitespace-pre-wrap min-h-[2.5rem]">{staffNotes[id]?.중요사항 || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">특이사항</span>
                  <p className="mt-0.5 text-gray-800 whitespace-pre-wrap min-h-[2.5rem]">{staffNotes[id]?.특이사항 || '-'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 직원별 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {staffSummary.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedStaff(selectedStaff === s.id ? 'all' : s.id)}
            className={`rounded-lg border-2 p-4 text-left transition-all ${selectedStaff === s.id
                ? `${s.border} ${s.light} shadow-md`
                : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
          >
            <div className={`text-base font-bold mb-2 ${s.text}`}>{s.name}</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-800">
                <span className="font-medium text-gray-700">관련 업무</span>
                <span className="font-semibold text-gray-900">{s.total}건</span>
              </div>
              <div className="flex justify-between text-gray-800">
                <span className="font-medium text-gray-700">완료</span>
                <span className="font-semibold text-green-700">{s.done}건</span>
              </div>
              <div className="flex justify-between text-gray-800">
                <span className="font-medium text-gray-700">담당자확인</span>
                <span className="font-semibold text-blue-700">{s.confirmed}건</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          {(['업무일지', '담당자확인', '완료현황'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab
                  ? 'border-b-2 border-slate-700 text-slate-700'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab}
              <span className="ml-1.5 text-xs text-gray-400">
                ({tab === '업무일지' ? filtered.length : tab === '담당자확인' ? confirmedItems.length : completedItems.length})
              </span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* 업무일지 탭 */}
          {activeTab === '업무일지' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                <span className="font-medium text-gray-700">{selectedStaff === 'all' ? '전체 직원' : selectedStaff}</span>의&nbsp;
                <span className="font-medium text-gray-700">{dateLabel()}</span> 관련 업무 {filtered.length}건
              </p>
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">해당 조건의 업무가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(c => {
                    const registrantName = ID_TO_NAME[c.등록자] || c.등록자;
                    const isExpanded = expandedId === c.id;
                    const confirmedBy = [
                      c.담당자확인_M03 ? '태형' : null,
                      c.담당자확인_M02 ? '아름' : null,
                      c.담당자확인_M01 ? '동훈' : null,
                    ].filter(Boolean).join(', ');

                    return (
                      <div key={c.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{c.차수}차 {c.호실}호</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(c.상태)}`}>{c.상태}</span>
                              <span className="text-xs text-gray-500 whitespace-nowrap">{c.구분}</span>
                              <span className="text-xs text-gray-700 truncate">{c.내용}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-gray-400">{fmtShort(c.등록일시)}</span>
                              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{registrantName}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2 text-xs">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                              <div><span className="text-gray-500">등록일시</span><span className="ml-2 text-gray-800">{fmtDate(c.등록일시)}</span></div>
                              <div><span className="text-gray-500">등록자</span><span className="ml-2 text-gray-800">{registrantName}</span></div>
                              {c.완료일시 && <div><span className="text-gray-500">완료일시</span><span className="ml-2 text-green-700">{fmtDate(c.완료일시)}</span></div>}
                              {c.조치일 && <div><span className="text-gray-500">조치일</span><span className="ml-2 text-gray-800">{fmtShort(c.조치일)}</span></div>}
                              {c.처리일 && <div><span className="text-gray-500">처리일</span><span className="ml-2 text-gray-800">{fmtShort(c.처리일)}</span></div>}
                              {c.이사일 && <div><span className="text-gray-500">이사일</span><span className="ml-2 text-gray-800">{fmtShort(c.이사일)}</span></div>}
                              {c.청소예정일 && <div><span className="text-gray-500">청소예정일</span><span className="ml-2 text-gray-800">{fmtShort(c.청소예정일)}</span></div>}
                              {c.숙박형태 && <div><span className="text-gray-500">숙박형태</span><span className="ml-2 text-gray-800">{c.숙박형태}</span></div>}
                              {confirmedBy && <div className="col-span-2"><span className="text-gray-500">담당자확인</span><span className="ml-2 text-blue-700 font-medium">{confirmedBy}</span></div>}
                            </div>
                            {c.조치사항 && (
                              <div>
                                <span className="text-gray-500">조치사항</span>
                                <p className="mt-0.5 text-gray-800 bg-white border border-gray-200 rounded px-2 py-1">{c.조치사항}</p>
                              </div>
                            )}
                            {c.객실정비조치 && (
                              <div>
                                <span className="text-gray-500">객실정비 조치</span>
                                <p className="mt-0.5 text-gray-800 bg-white border border-gray-200 rounded px-2 py-1">{c.객실정비조치}</p>
                              </div>
                            )}
                            {c.도어락비번 && (
                              <div>
                                <span className="text-gray-500">도어락 비번</span>
                                <span className="ml-2 text-gray-800 font-mono">{c.도어락비번}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 담당자확인 탭 */}
          {activeTab === '담당자확인' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                M03(태형) · M02(아름) · M01(동훈) 담당자확인 완료 항목 {confirmedItems.length}건
              </p>
              {confirmedItems.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">담당자확인 항목이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {confirmedItems.map(c => {
                    const who = [
                      c.담당자확인_M03 ? <span key="m03" className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">태형</span> : null,
                      c.담당자확인_M02 ? <span key="m02" className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">아름</span> : null,
                      c.담당자확인_M01 ? <span key="m01" className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">동훈</span> : null,
                    ].filter(Boolean);
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-4 py-3 bg-white">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs text-gray-500 whitespace-nowrap">{c.차수}차 {c.호실}호</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(c.상태)}`}>{c.상태}</span>
                          <span className="text-xs text-gray-500">{c.구분}</span>
                          <span className="text-xs text-gray-700 truncate">{c.내용}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {who}
                          <span className="text-xs text-gray-400">{fmtShort(c.등록일시)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 완료현황 탭 */}
          {activeTab === '완료현황' && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                <span className="font-medium text-gray-700">{selectedStaff === 'all' ? '전체' : selectedStaff}</span>의&nbsp;
                <span className="font-medium text-gray-700">{dateLabel()}</span> 완료 처리 {completedItems.length}건
              </p>
              {completedItems.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">완료 항목이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {completedItems.map(c => {
                    const registrantName = ID_TO_NAME[c.등록자] || c.등록자;
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2 border border-green-200 rounded-lg px-4 py-3 bg-green-50">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs text-gray-500 whitespace-nowrap">{c.차수}차 {c.호실}호</span>
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">완료</span>
                          <span className="text-xs text-gray-500">{c.구분}</span>
                          <span className="text-xs text-gray-700 truncate">{c.내용}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500">{fmtDate(c.완료일시)}</span>
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{registrantName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
