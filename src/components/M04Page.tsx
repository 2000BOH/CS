import { useState, useMemo } from 'react';
import { LifeBuoy, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Complaint, RoomInfo } from '../types';

interface M04PageProps {
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
  지원상태: '요청' | '완료';
  원본데이터: Complaint;
}

type StatusFilter = '요청' | '완료' | '전체';

export function M04Page({ complaints, rooms, onUpdate }: M04PageProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('요청');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tasks: TaskItem[] = useMemo(() => {
    return complaints
      .filter(c => c.지원상태 === '요청' || c.지원상태 === '완료')
      .map(c => {
        const matchingRoom = rooms.find(room => {
          const c차수 = c.차수.replace(/[^0-9]/g, '');
          const r차수 = String(room.차수).replace(/[^0-9]/g, '');
          const c호실 = c.호실.replace(/[^0-9]/g, '');
          const r호실 = String(room.호수).replace(/[^0-9]/g, '');
          return c차수 === r차수 && c호실 === r호실;
        });
        const 기준날짜 = c.지원요청일시 || c.이사일 || c.처리일 || c.조치일 || c.등록일시;
        return {
          id: c.id,
          차수: c.차수,
          호실: c.호실,
          숙박형태: matchingRoom?.숙박형태 || c.숙박형태 || '-',
          내용: c.내용,
          조치사항: c.조치사항,
          기준날짜,
          지원상태: c.지원상태 as '요청' | '완료',
          원본데이터: c,
        };
      });
  }, [complaints, rooms]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => statusFilter === '전체' ? true : t.지원상태 === statusFilter)
      .sort((a, b) => {
        if (a.지원상태 !== b.지원상태) return a.지원상태 === '요청' ? -1 : 1;
        return (b.기준날짜 || '').localeCompare(a.기준날짜 || '');
      });
  }, [tasks, statusFilter]);

  const handleComplete = (task: TaskItem) => {
    // 토글: 완료 → 요청으로 복구, 요청 → 완료로 전환
    if (task.지원상태 === '완료') {
      onUpdate(task.id, {
        지원상태: '요청',
        지원완료일시: undefined,
      });
    } else {
      onUpdate(task.id, {
        지원상태: '완료',
        지원완료일시: new Date().toISOString(),
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'yy.MM.dd (E) HH:mm', { locale: ko });
    } catch {
      return '-';
    }
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'yy.MM.dd (E)', { locale: ko });
    } catch {
      return '-';
    }
  };

  const counts = {
    요청: tasks.filter(t => t.지원상태 === '요청').length,
    완료: tasks.filter(t => t.지원상태 === '완료').length,
    전체: tasks.length,
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <LifeBuoy className="w-8 h-8" />
          <h1 className="text-2xl font-bold">M04 - 지원</h1>
        </div>
        <p className="text-blue-100 text-sm">M01~M03 담당자가 '지원요청'한 건을 처리하는 페이지</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(['요청', '완료', '전체'] as StatusFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter} ({counts[filter]})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">해당 상태의 지원요청이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">차수/호실</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">숙박형태</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">구분</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b">내용</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b">조치사항</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">요청일시</th>
                  <th className="px-3 py-0.5 text-left text-xs font-medium border-b whitespace-nowrap">완료일시</th>
                  <th className="px-3 py-0.5 text-center text-xs font-medium border-b whitespace-nowrap">지원상태</th>
                  <th className="px-3 py-0.5 text-center text-xs font-medium border-b whitespace-nowrap">상세</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const rows = [
                    <tr
                      key={task.id}
                      className={`border-b border-gray-300 cursor-pointer transition-all ${
                        task.지원상태 === '완료' ? 'opacity-60 bg-gray-50' : 'hover:bg-blue-50'
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
                      <td className="px-3 py-0.5 text-xs text-gray-900 max-w-xs">
                        <div className="truncate">{task.내용 || '-'}</div>
                      </td>
                      <td className="px-3 py-0.5 text-xs text-gray-900 max-w-xs">
                        <div className="truncate">{task.조치사항 || '-'}</div>
                      </td>
                      <td className="px-3 py-0.5 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(task.원본데이터.지원요청일시)}
                      </td>
                      <td className="px-3 py-0.5 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(task.원본데이터.지원완료일시)}
                      </td>
                      <td className="px-3 py-0.5 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(task);
                          }}
                          title={task.지원상태 === '완료' ? '한번 더 누르면 요청 상태로 복구됩니다' : ''}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                            task.지원상태 === '완료'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          지원완료
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
                        <td colSpan={9} className="px-6 py-4">
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
                          <div className="mt-4 flex items-center gap-6 text-sm flex-wrap">
                            <div>
                              <span className="text-gray-600 font-medium">등록일시:</span>
                              <span className="text-gray-900 ml-1">{formatDate(task.원본데이터.등록일시)}</span>
                            </div>
                            {task.원본데이터.처리일 && (
                              <div>
                                <span className="text-gray-600 font-medium">처리일:</span>
                                <span className="text-gray-900 ml-1">{formatShortDate(task.원본데이터.처리일)}</span>
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
  );
}
