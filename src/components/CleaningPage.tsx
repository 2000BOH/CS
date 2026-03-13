import { useState } from 'react';
import { Complaint } from '../App';
import { Calendar as CalendarIcon, CheckCircle, ChevronDown, ChevronUp, Star, Printer, Table } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { getRoomInfo } from '../data/roomData';

interface CleaningPageProps {
  complaints: Complaint[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  onImageClick: (image: string) => void;
  currentUserId?: string;
  rooms?: any[];
}

export function CleaningPage({ complaints, onUpdate, onImageClick, currentUserId, rooms }: CleaningPageProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cleaningDatePopovers, setCleaningDatePopovers] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cleaningViewMode');
      return (saved as 'card' | 'table') || 'table'; // 기본값을 'table'로 변경
    }
    return 'table'; // 기본값을 'table'로 변경
  });
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  // 뷰 모드 변경 시 localStorage에 저장
  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cleaningViewMode', mode);
    }
  };

  // 청소 구분 + 퇴실상태 "퇴실" + 영선에서 "청소요청"으로 넘긴 건도 포함
  const cleaningComplaints = complaints.filter(c => 
    c.구분 === '청소' || c.퇴실상태 === '퇴실' || c.상태 === '청소요청'
  );

  // 날짜 비교 함수
  const isToday = (dateString: string | undefined) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (dateString: string | undefined) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const isFutureDate = (dateString: string | undefined) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  // 필터 토글 함수
  const toggleFilter = (filterKey: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterKey)
        ? prev.filter(f => f !== filterKey)
        : [...prev, filterKey]
    );
  };

  // 필터 적용 (청소예정일 기준) - OR 건
  const filteredComplaints = selectedFilters.length === 0
    ? cleaningComplaints
    : cleaningComplaints.filter(c => {
        return selectedFilters.some(filter => {
          switch (filter) {
            case '오늘':
              return isToday(c.청소예정일);
            case '내일':
              return isTomorrow(c.청소예정일);
            case '예정':
              return isFutureDate(c.청소예정일);
            case '미완료':
              return c.상태 !== '완료';
            case '완료':
              return c.상태 === '완료';
            case '우선처리':
              return c.우선처리 === true;
            default:
              return false;
          }
        });
      });

  // 청소예정일이 빠른 순으로 정렬 (우선처리로 재정렬하지 않음)
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    // 완료된 건은 맨 뒤로
    if (a.상태 === '완료' && b.상태 !== '완료') return 1;
    if (a.상태 !== '완료' && b.상태 === '완료') return -1;
    
    // 청소예정일이 빠른 순으로 정렬
    if (a.청소예정일 && b.청소예정일) {
      return new Date(a.청소예정일).getTime() - new Date(b.청소예정일).getTime();
    }
    if (a.청소예정일) return -1;
    if (b.청소예정일) return 1;
    
    return new Date(b.등록일시).getTime() - new Date(a.등록일시).getTime();
  });

  // 필터 버튼 데이터
  const filterButtons = [
    { key: '오늘', label: '오늘', count: cleaningComplaints.filter(c => isToday(c.청소예정일)).length },
    { key: '내일', label: '내일', count: cleaningComplaints.filter(c => isTomorrow(c.청소예정일)).length },
    { key: '예정', label: '예정', count: cleaningComplaints.filter(c => isFutureDate(c.청소예정일)).length },
    { key: '미완료', label: '미완료', count: cleaningComplaints.filter(c => c.상태 !== '완료').length },
    { key: '완료', label: '완료', count: cleaningComplaints.filter(c => c.상태 === '완료').length },
    { key: '우선처리', label: '우선처리', count: cleaningComplaints.filter(c => c.우선처리).length },
  ];

  // 완료 처리 — 상태='완료' + 완료일시 세팅 + 퇴실상태가 '퇴실'이면 자동으로 '완료'로 올림
  const handleComplete = (id: string) => {
    const target = complaints.find(c => c.id === id);
    const updates: Parameters<typeof onUpdate>[1] = {
      상태: '완료',
      완료일시: new Date().toISOString(),
    };
    if (target?.퇴실상태 === '퇴실') {
      updates.퇴실상태 = '완료';
    }
    onUpdate(id, updates);
  };

  // 우선처리 토글
  const togglePriority = (id: string, current: boolean | undefined) => {
    onUpdate(id, { 우선처리: !current });
  };

  // 프린트 핸들러
  const handlePrint = () => {
    // 청소팀 전용 정보 가오기 (10 아이디용)
    let cleaningTeamInfo = '';
    if (currentUserId === '10' && sortedComplaints.length > 0) {
      cleaningTeamInfo = `
        <div style="margin: 10px 0; padding: 10px; border: 2px solid #000; border-radius: 8px; font-size: 13px; text-align: center;">
          비밀번호 : 퇴실 및 퇴실점검 후 ➡️ 2026 | 청소 및 입실점검 후 ➡️ 차수0 + 호실0000
        </div>
      `;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>객실정비 리스트</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #1e40af; color: white; }
        </style>
      </head>
      <body>
        <h1>객실정비 리스트</h1>
        <p>출력일시: ${new Date().toLocaleString('ko-KR')}</p>
        ${cleaningTeamInfo}
        <table>
          <thead>
            <tr>
              <th>번호</th>
              <th>우선</th>
              <th>차수</th>
              <th>호실</th>
              <th>상태</th>
              <th>청소예정일</th>
              <th>조치사항</th>
            </tr>
          </thead>
          <tbody>
            ${sortedComplaints.map((c, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${c.우선처리 ? '★' : ''}</td>
                <td>${c.차수}차</td>
                <td>${c.호실}호</td>
                <td>${c.상태}</td>
                <td>${c.청소예정일 ? new Date(c.청소예정일).toLocaleDateString('ko-KR') : '-'}</td>
                <td>${c.객실정비조치 || c.조치사항}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const yy = String(year - 2000).padStart(2, '0'); // 2000년을 빼서 실질적으로 20을 뺀 효과
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${yy}.${month}.${day} (${dayName}) ${hours}:${minutes}`;
  };

  const formatShortDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const yy = String(year - 2000).padStart(2, '0'); // 2000년을 빼서 실질적으로 20을 뺀 효과
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${yy}.${month}.${day} (${dayName})`;
  };

  // 청소예정일에 따른 우선순위 표시
  const getDateBadgeColor = (dateString: string | undefined) => {
    if (!dateString) return 'text-gray-500';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate < today) return 'text-red-600 font-bold';
    if (targetDate.getTime() === today.getTime()) return 'text-orange-600 font-bold';
    if (targetDate.getTime() === new Date(today.getTime() + 86400000).getTime()) return 'text-yellow-600 font-bold';
    return 'text-blue-600';
  };

  return (
    <div className="space-y-3">
      {/* 헤더 & 필터 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-gray-900">🧹 객실정비 관리 (정비상태) <span className="text-sm text-gray-500 ml-2">전체 {cleaningComplaints.length}건 | 표시 {sortedComplaints.length}건</span></h2>
          </div>

          {/* 청소팀 전용 정보 - 10번 아이디만 표시 */}
          {currentUserId === '10' && sortedComplaints.length > 0 && (() => {
            return (
              <div className="flex items-center">
                <div className="flex items-center gap-3 text-sm px-5 py-2 rounded-lg border-2 border-black">
                  <span className="text-gray-700">비밀번호 : 퇴실 및 퇴실점검 후 ➡️ 2026</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-700">청소 및 입실점검 후 ➡️ 차수0 + 호실0000</span>
                </div>
              </div>
            );
          })()}
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleViewModeChange(viewMode === 'card' ? 'table' : 'card')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs"
            >
              <Table className="w-4 h-4" />
              {viewMode === 'card' ? '상세보기' : '카드보기'}
            </button>
            <button
              onClick={handlePrint}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs"
            >
              <Printer className="w-4 h-4" />
              프린트
            </button>
          </div>
        </div>

        {/* 필터 버튼 */}
        <div className="flex flex-wrap gap-3">
          {filterButtons.map(filter => {
            const isSelected = selectedFilters.includes(filter.key);
            return (
              <button
                key={filter.key}
                onClick={() => toggleFilter(filter.key)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all border ${
                  isSelected
                    ? 'bg-lime-500 text-white border-lime-600 shadow-sm'
                    : 'bg-white text-gray-700 border-lime-200 hover:bg-lime-50'
                }`}
              >
                {filter.label} <span className="font-bold">({filter.count})</span>
              </button>
            );
          })}
          {selectedFilters.length > 0 && (
            <button
              onClick={() => setSelectedFilters([])}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
            >
              전체 보기
            </button>
          )}
        </div>
      </div>

      {/* 청소 리스트 - 2열 그리드 */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sortedComplaints.map((complaint) => (
            <div
              key={complaint.id}
              className={`bg-white rounded-lg shadow-md border-2 transition-all ${
                complaint.우선처리 ? 'border-yellow-400 bg-yellow-50' : 
                complaint.상태 === '완료' ? 'border-gray-200 bg-gray-50/50 opacity-30' : 'border-gray-200'
              }`}
            >
              <div 
                className="p-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    {/* 우선처리 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePriority(complaint.id, complaint.우선처리);
                      }}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all border-2 ${
                        complaint.우선처리
                          ? 'bg-yellow-400 border-yellow-500 text-white shadow-md'
                          : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${complaint.우선처리 ? 'fill-current' : ''}`} />
                    </button>

                    <span className="text-sm font-bold text-gray-700">
                      {complaint.차수}차 {complaint.호실}호
                    </span>
                    <span className={`text-xs font-medium ${getDateBadgeColor(complaint.청소예정일)}`}>
                      {formatShortDate(complaint.청소예정일)}
                    </span>
                  </div>
                  
                  {/* 상태 변경 버튼 그룹 */}
                  <div className="flex items-center gap-1">
                    {/* 접수 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(complaint.id, { 상태: '접수' });
                      }}
                      className={`px-2 py-1 rounded-lg transition-colors text-xs font-medium shadow-sm flex-shrink-0 ${
                        complaint.상태 === '접수'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-white hover:bg-gray-400'
                      }`}
                    >
                      접수
                    </button>
                    
                    {/* 정비중 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(complaint.id, { 상태: '진행중' });
                      }}
                      className={`px-2 py-1 rounded-lg transition-colors text-xs font-medium shadow-sm flex-shrink-0 ${
                        complaint.상태 === '진행중'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-white hover:bg-gray-400'
                      }`}
                    >
                      정비중
                    </button>

                    {/* 완료 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(complaint.id, { 상태: '완료', 완료일시: new Date().toISOString() });
                      }}
                      className={`px-2 py-1 rounded-lg transition-colors text-xs font-medium shadow-sm flex-shrink-0 ${
                        complaint.상태 === '완료'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-300 text-white hover:bg-gray-400'
                      }`}
                      title="완료 처리"
                    >
                      {complaint.상태 === '완료' ? '완료' : '완료전'}
                    </button>

                    {expandedId === complaint.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-1">{complaint.조치사항 || '조치사항 없음'}</p>
              </div>

              {/* 확장 영역 */}
              {expandedId === complaint.id && (
                <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-3">
                  {/* 청소예정일 입력 */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      청소예정일 설정
                    </label>
                    <Popover 
                      open={cleaningDatePopovers[complaint.id]} 
                      onOpenChange={(open) => setCleaningDatePopovers({...cleaningDatePopovers, [complaint.id]: open})}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-left flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          <span className={complaint.청소예정일 ? 'text-gray-900' : 'text-gray-500'}>
                            {complaint.청소예정일 ? formatShortDate(complaint.청소예정일) : '날짜 선택'}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md" align="start">
                        <Calendar
                          mode="single"
                          selected={complaint.청소예정일 ? new Date(complaint.청소예정일) : undefined}
                          onSelect={(date) => {
                            onUpdate(complaint.id, { 청소예정일: date?.toISOString() });
                            setCleaningDatePopovers({...cleaningDatePopovers, [complaint.id]: false});
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* 비밀번호 + 객실정비 조치 (좁은 비번 / 넓은 조치사항) */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      비밀번호 / 객실정비 조치
                    </label>
                    <div className="flex gap-2 items-start">
                      {/* 상단 제목 */}
                      <div className="w-2/12 min-w-[60px] text-center text-[11px] text-gray-500">
                        비번
                      </div>
                      <div className="flex-1 text-center text-[11px] text-gray-500">
                        조치사항
                      </div>
                    </div>
                    <div className="flex gap-2 items-start mt-1">
                      {/* 비밀번호 (도어락비번 필드 사용) */}
                      <input
                        type="text"
                        defaultValue={complaint.도어락비번 || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (complaint.도어락비번 || '')) {
                            onUpdate(complaint.id, { 도어락비번: e.target.value });
                          }
                        }}
                        className="w-2/12 min-w-[60px] px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 text-center"
                        placeholder="비밀번호"
                      />
                      {/* 조치사항 (객실정비조치 필드를 사용) */}
                      <textarea
                        key={`action-${complaint.id}`}
                        defaultValue={complaint.객실정비조치 || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (complaint.객실정비조치 || '')) {
                            onUpdate(complaint.id, { 객실정비조치: e.target.value });
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none"
                        rows={3}
                        placeholder="객실정비 조치사항을 입력하세요"
                      />
                    </div>
                  </div>

                  {/* 사진 */}
                  {complaint.사진 && complaint.사진.length > 0 && (
                    <div className="flex gap-2">
                      {complaint.사진.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`첨부 ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded border border-gray-300 cursor-pointer hover:border-blue-500 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            onImageClick(img);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* 하단 정보 */}
                  <div className="text-xs text-gray-500 pt-2 border-t space-y-0.5">
                    <div>등록: {formatDate(complaint.등록일시)}</div>
                    {complaint.완료일시 && (
                      <div className="text-green-600">완료: {formatDate(complaint.완료일시)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {sortedComplaints.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500">해당 조건의 청소 민원이 없습니다.</p>
            </div>
          )}
        </div>
      ) : (
        // 테이블 뷰 (2열)
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 왼쪽 테이블 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: '12px' }}>
                <thead className="bg-blue-700 text-white">
                  <tr>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-8">번호</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-8">우선</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-10">차수</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-12">호실</th>
                    <th className="px-1 py-1 text-center font-semibold whitespace-nowrap w-16">상태</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-20">청소예정일</th>
                    <th className="px-1 py-1 text-center font-semibold whitespace-nowrap w-16">비번</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap">조치사항</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedComplaints.filter((_, i) => i % 2 === 0).map((complaint, idx) => {
                    const actualIndex = idx * 2;
                    return (
                  <tr key={complaint.id} className={`transition-colors ${complaint.우선처리 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'} ${complaint.상태 === '완료' ? 'opacity-50' : ''}`}>
                        <td className="px-2 py-1 text-gray-900 whitespace-nowrap">{actualIndex + 1}</td>
                    
                    <td className="px-2 py-1 whitespace-nowrap">
                      <button
                        onClick={() => togglePriority(complaint.id, complaint.우선처리)}
                        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all border-2 ${
                          complaint.우선처리
                            ? 'bg-yellow-400 border-yellow-500 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'
                        }`}
                        title={complaint.우선처리 ? '우선처리 해제' : '우선처리 설정'}
                      >
                        <Star className={`w-4 h-4 ${complaint.우선처리 ? 'fill-current' : ''}`} />
                      </button>
                    </td>
                    
                    <td className="px-2 py-1 whitespace-nowrap">
                      {editingCell?.id === complaint.id && editingCell?.field === '차수' ? (
                        <select
                          value={complaint.차수}
                          onChange={(e) => {
                            onUpdate(complaint.id, { 차수: e.target.value });
                            setEditingCell(null);
                          }}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          className="w-full px-2 py-1 border border-blue-500 rounded"
                          style={{ fontSize: '13px' }}
                        >
                          <option value="1">1차</option>
                          <option value="2">2차</option>
                          <option value="3">3차</option>
                          <option value="4">4차</option>
                        </select>
                      ) : (
                        <span 
                          onClick={() => setEditingCell({ id: complaint.id, field: '차수' })}
                          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded block text-gray-900"
                        >
                          {complaint.차수}차
                        </span>
                      )}
                    </td>
                    
                    <td className="px-2 py-1 whitespace-nowrap">
                      {editingCell?.id === complaint.id && editingCell?.field === '호실' ? (
                        <input
                          type="text"
                          value={complaint.호실}
                          onChange={(e) => onUpdate(complaint.id, { 호실: e.target.value })}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          className="w-full px-2 py-1 border border-blue-500 rounded"
                          style={{ fontSize: '13px' }}
                        />
                      ) : (
                        <span 
                          onClick={() => setEditingCell({ id: complaint.id, field: '호실' })}
                          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded block text-gray-900"
                        >
                          {complaint.호실}호
                        </span>
                      )}
                    </td>
                    
                    <td className="px-2 py-1 whitespace-nowrap text-center">
                      <div className="flex gap-1 items-center justify-center">
                        {(['접수', '진행중', '완료'] as const).map((status, index) => {
                          const currentIndex = ['접수', '진행중', '완료'].indexOf(complaint.상태 as any);
                          const isPast = index < currentIndex;
                          const isActive = complaint.상태 === status;
                          
                          return (
                            <div key={`${complaint.id}-${status}`} className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdate(complaint.id, { 상태: status });
                                }}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                  isActive
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                                } ${isPast ? 'opacity-40' : ''}`}
                              >
                                {status}
                              </button>
                              {index < 2 && (
                                <span className={`text-gray-400 text-xs ${isPast ? 'opacity-40' : ''}`}>▶</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    
                    <td className="px-2 py-1 whitespace-nowrap" style={{ width: '120px' }}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-left hover:bg-blue-50 px-2 py-1 rounded text-gray-900 w-full">
                            {formatShortDate(complaint.청소예정일)}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={complaint.청소예정일 ? new Date(complaint.청소예정일) : undefined}
                            onSelect={(date) => onUpdate(complaint.id, { 청소예정일: date?.toISOString() })}
                          />
                        </PopoverContent>
                      </Popover>
                    </td>
                    
                    <td className="px-2 py-1 whitespace-nowrap">
                      {/* 비번 (도어락비번 필드 사용) */}
                      <input
                        type="text"
                        defaultValue={complaint.도어락비번 || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (complaint.도어락비번 || '')) {
                            onUpdate(complaint.id, { 도어락비번: e.target.value });
                          }
                        }}
                        className="w-[70px] px-1.5 py-1 border border-gray-300 rounded text-xs text-gray-900 text-center"
                      />
                    </td>
                    <td className="px-2 py-1" style={{ minWidth: '260px' }}>
                      {/* 조치사항 (객실정비조치 필드 사용) */}
                      <input
                        type="text"
                        key={`action-${complaint.id}`}
                        defaultValue={complaint.객실정비조치 || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (complaint.객실정비조치 || '')) {
                            onUpdate(complaint.id, { 객실정비조치: e.target.value });
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                      />
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedComplaints.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">해당 조건의 청소 민원이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 오른쪽 테이블 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: '12px' }}>
                <thead className="bg-blue-700 text-white">
                  <tr>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-8">번호</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-8">우선</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-10">차수</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-12">호실</th>
                    <th className="px-1 py-1 text-center font-semibold whitespace-nowrap w-16">상태</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap w-20">청소예정일</th>
                    <th className="px-1 py-1 text-center font-semibold whitespace-nowrap w-16">비번</th>
                    <th className="px-1 py-1 text-left font-semibold whitespace-nowrap">조치사항</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedComplaints.filter((_, i) => i % 2 === 1).map((complaint, idx) => {
                    const actualIndex = idx * 2 + 1;
                    return (
                      <tr key={complaint.id} className={`transition-colors ${complaint.우선처리 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'} ${complaint.상태 === '완료' ? 'opacity-50' : ''}`}>
                        <td className="px-2 py-1 text-gray-900 whitespace-nowrap">{actualIndex + 1}</td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <button
                            onClick={() => togglePriority(complaint.id, complaint.우선처리)}
                            className={`flex items-center justify-center w-7 h-7 rounded-full transition-all border-2 ${
                              complaint.우선처리
                                ? 'bg-yellow-400 border-yellow-500 text-white shadow-md'
                                : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'
                            }`}
                            title={complaint.우선처리 ? '우선처리 해제' : '우선처리 설정'}
                          >
                            <Star className={`w-4 h-4 ${complaint.우선처리 ? 'fill-current' : ''}`} />
                          </button>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {editingCell?.id === complaint.id && editingCell?.field === '차수' ? (
                            <select
                              value={complaint.차수}
                              onChange={(e) => {
                                onUpdate(complaint.id, { 차수: e.target.value });
                                setEditingCell(null);
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              className="w-full px-2 py-1 border border-blue-500 rounded"
                              style={{ fontSize: '13px' }}
                            >
                              <option value="1">1차</option>
                              <option value="2">2차</option>
                              <option value="3">3차</option>
                              <option value="4">4차</option>
                            </select>
                          ) : (
                            <span 
                              onClick={() => setEditingCell({ id: complaint.id, field: '차수' })}
                              className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded block text-gray-900"
                            >
                              {complaint.차수}차
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {editingCell?.id === complaint.id && editingCell?.field === '호실' ? (
                            <input
                              type="text"
                              value={complaint.호실}
                              onChange={(e) => onUpdate(complaint.id, { 호실: e.target.value })}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                              className="w-full px-2 py-1 border border-blue-500 rounded"
                              style={{ fontSize: '13px' }}
                            />
                          ) : (
                            <span 
                              onClick={() => setEditingCell({ id: complaint.id, field: '호실' })}
                              className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded block text-gray-900"
                            >
                              {complaint.호실}호
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-center">
                          <div className="flex gap-1 items-center justify-center">
                            {(['접수', '진행중', '완료'] as const).map((status, index) => {
                              const currentIndex = ['접수', '진행중', '완료'].indexOf(complaint.상태 as any);
                              const isPast = index < currentIndex;
                              const isActive = complaint.상태 === status;
                              
                              return (
                                <div key={`${complaint.id}-${status}`} className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdate(complaint.id, {
                                        상태: status,
                                        ...(status === '완료' ? {
                                          완료일시: new Date().toISOString(),
                                          ...(complaint.퇴실상태 === '퇴실' ? { 퇴실상태: '완료' } : {})
                                        } : {})
                                      });
                                    }}
                                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                      isActive
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                                    } ${isPast ? 'opacity-40' : ''}`}
                                  >
                                    {status}
                                  </button>
                                  {index < 2 && (
                                    <span className={`text-gray-400 text-xs ${isPast ? 'opacity-40' : ''}`}>▶</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap" style={{ width: '120px' }}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-left hover:bg-blue-50 px-2 py-1 rounded text-gray-900 w-full">
                                {formatShortDate(complaint.청소예정일)}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={complaint.청소예정일 ? new Date(complaint.청소예정일) : undefined}
                                onSelect={(date) => onUpdate(complaint.id, { 청소예정일: date?.toISOString() })}
                              />
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                      {/* 비번 (도어락비번 필드 사용) */}
                      <input
                        type="text"
                        defaultValue={complaint.도어락비번 || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (complaint.도어락비번 || '')) {
                            onUpdate(complaint.id, { 도어락비번: e.target.value });
                          }
                        }}
                        className="w-[70px] px-1.5 py-1 border border-gray-300 rounded text-xs text-gray-900 text-center"
                      />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: '260px' }}>
                      {/* 조치사항 (객실정비조치 필드 사용) */}
                      <input
                        type="text"
                        key={`action-${complaint.id}`}
                        defaultValue={complaint.객실정비조치 || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (complaint.객실정비조치 || '')) {
                            onUpdate(complaint.id, { 객실정비조치: e.target.value });
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                      />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sortedComplaints.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">해당 조건의 청소 민원이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}