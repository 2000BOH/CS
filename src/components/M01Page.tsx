import { useState, useMemo, Fragment } from 'react';
import { Calendar, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday, isThisWeek, isThisMonth, parseISO, isBefore, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Complaint, RoomInfo } from '../App';
import { StaffDailyNotePanel } from './StaffDailyNotePanel';

interface M01PageProps {
  complaints: Complaint[];
  rooms: RoomInfo[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
}

interface TaskItem {
  id: string;
  차수: string;
  호실: string;
  숙박형태: string;
  내용: string;
  조치사항: string;
  기준날짜: string;
  담당자확인: boolean;
  원본데이터: Complaint;
}

type DateFilter = '미처리' | '오늘' | '이번주' | '이번달';

export function M01Page({ complaints, rooms, onUpdate }: M01PageProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('오늘');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tasks: TaskItem[] = useMemo(() => {
    const result: TaskItem[] = [];
    
    complaints.forEach(complaint => {
      const matchingRoom = rooms.find(room => {
        const c차수 = complaint.차수.replace(/[^0-9]/g, '');
        const r차수 = room.차수.replace(/[^0-9]/g, '');
        const c호실 = complaint.호실.replace(/[^0-9]/g, '');
        const r호실 = room.호수.replace(/[^0-9]/g, '');
        return c차수 === r차수 && c호실 === r호실 && room.숙박형태 === '인스파이어';
      });

      if (matchingRoom) {
        const 기준날짜 = complaint.이사일 || complaint.처리일 || complaint.조치일 || complaint.등록일시;
        
        result.push({
          id: complaint.id,
          차수: complaint.차수,
          호실: complaint.호실,
          숙박형태: matchingRoom.숙박형태 || '인스파이어',
          내용: complaint.내용,
          조치사항: complaint.조치사항,
          기준날짜,
          담당자확인: complaint.담당자확인_M01 || false,
          원본데이터: complaint,
        });
      }
    });

    return result;
  }, [complaints, rooms]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.기준날짜) return false;
      
      try {
        const date = parseISO(task.기준날짜);
        const today = startOfDay(new Date());
        
        if (dateFilter === '미처리') {
          return isBefore(date, today) && task.원본데이터.상태 !== '완료';
        }
        if (dateFilter === '오늘') return isToday(date);
        if (dateFilter === '이번주') return isThisWeek(date, { locale: ko });
        if (dateFilter === '이번달') return isThisMonth(date);
        
        return false;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      if (a.담당자확인 !== b.담당자확인) {
        return a.담당자확인 ? 1 : -1;
      }
      return b.기준날짜.localeCompare(a.기준날짜);
    });
  }, [tasks, dateFilter]);

  const handleManagerConfirm = (task: TaskItem) => {
    const nowConfirmed = !task.담당자확인;
    onUpdate(task.id, {
      담당자확인_M01: nowConfirmed,
      ...(nowConfirmed ? { 상태: '진행중' } : {}),
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'yy.MM.dd (E) HH:mm', { locale: ko });
    } catch {
      return '-';
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'yy.MM.dd (E)', { locale: ko });
    } catch {
      return '-';
    }
  };

  const noTypeRooms = rooms.filter(r => !r.숙박형태 || r.숙박형태.trim() === '');

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0 space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8" />
          <h1 className="text-2xl font-bold">M01 - 인스파이어 관리</h1>
        </div>
        <p className="text-blue-100 text-sm">숙박형태 "인스파이어" 업무 체크리스트</p>
      </div>
      {noTypeRooms.length > 0 && (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-yellow-800 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-yellow-500" />
          <span>숙박형태가 미설정된 객실이 <strong>{noTypeRooms.length}개</strong> 있습니다. 해당 객실은 M01~M03 목록에 표시되지 않습니다. (입력 페이지에서 숙박형태를 설정해 주세요)</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(['미처리', '오늘', '이번주', '이번달'] as DateFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateFilter === filter
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter} ({tasks.filter(t => {
                if (!t.기준날짜) return false;
                try {
                  const date = parseISO(t.기준날짜);
                  const today = startOfDay(new Date());
                  if (filter === '미처리') return isBefore(date, today) && t.원본데이터.상태 !== '완료';
                  if (filter === '오늘') return isToday(date);
                  if (filter === '이번주') return isThisWeek(date, { locale: ko });
                  if (filter === '이번달') return isThisMonth(date);
                  return false;
                } catch {
                  return false;
                }
              }).length})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">해당 기간의 업무가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">차수/호실</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">숙박형태</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">구분</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">상태</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b">내용</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b">조치사항</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">기준일</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">등록일시</th>
                  <th className="px-3 py-0.5 text-center text-xs font-medium border-b whitespace-nowrap">담당자확인</th>
                  <th className="px-3 py-0.5 text-center text-xs font-medium border-b whitespace-nowrap">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const rows = [
                    <tr
                      key={task.id}
                      className={`border-b border-gray-300 cursor-pointer transition-all ${
                        task.담당자확인
                          ? 'opacity-50 bg-gray-100'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    >
                      <td className="px-3 py-0.5 text-xs font-bold text-gray-900 whitespace-nowrap">
                        {task.차수}차 {task.호실}호
                      </td>
                      <td className="px-3 py-0.5 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {task.숙박형태}
                        </span>
                      </td>
                      <td className="px-3 py-0.5 whitespace-nowrap">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {task.원본데이터.구분}
                        </span>
                      </td>
                      <td className="px-3 py-0.5 whitespace-nowrap">
                        {task.원본데이터.상태 && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.원본데이터.상태 === '완료' ? 'bg-green-100 text-green-700' :
                            task.원본데이터.상태 === '진행중' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.원본데이터.상태}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-0.5 text-xs text-gray-900 max-w-xs">
                        <div className="truncate">
                          {task.내용 || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-0.5 text-xs text-gray-900 max-w-xs">
                        <div className="truncate">
                          {task.조치사항 || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-0.5 text-xs text-gray-600 whitespace-nowrap">
                        {formatShortDate(task.기준날짜)}
                      </td>
                      <td className="px-3 py-0.5 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(task.원본데이터.등록일시)}
                      </td>
                      <td className="px-3 py-0.5 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManagerConfirm(task);
                          }}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                            task.담당자확인
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {task.담당자확인 ? '✓' : '확인'}
                        </button>
                      </td>
                      <td className="px-3 py-0.5 text-center whitespace-nowrap">
                        {expandedId === task.id ? (
                          <ChevronUp className="w-4 h-4 text-blue-600 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ];

                  if (expandedId === task.id) {
                    rows.push(
                      <tr key={`${task.id}-expanded`} className="bg-gray-50">
                        <td colSpan={10} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-2">민원 내용 (전체)</label>
                              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200 min-h-[80px]">
                                {task.내용 || '-'}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-2">조치사항 (전체)</label>
                              <p className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200 min-h-[80px]">
                                {task.조치사항 || '-'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-6 text-sm">
                            {task.원본데이터.처리일 && (
                              <div>
                                <span className="text-gray-600 font-medium">처리일:</span>
                                <span className="text-gray-900 ml-1">{formatShortDate(task.원본데이터.처리일)}</span>
                              </div>
                            )}
                            {task.원본데이터.이사일 && (
                              <div>
                                <span className="text-gray-600 font-medium">이사일:</span>
                                <span className="text-gray-900 ml-1">{formatShortDate(task.원본데이터.이사일)}</span>
                              </div>
                            )}
                            {task.원본데이터.청소예정일 && (
                              <div>
                                <span className="text-gray-600 font-medium">청소예정일:</span>
                                <span className="text-gray-900 ml-1">{formatShortDate(task.원본데이터.청소예정일)}</span>
                              </div>
                            )}
                            {task.원본데이터.조치일 && (
                              <div>
                                <span className="text-gray-600 font-medium">조치일:</span>
                                <span className="text-gray-900 ml-1">{formatShortDate(task.원본데이터.조치일)}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return rows;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      <StaffDailyNotePanel staffId="02" staffName="동훈" />
    </div>
  );
}