import { useState } from 'react';
import { Complaint } from '../types';
import { Printer, FileDown, Star, Calendar as CalendarIcon, ChevronDown, ChevronUp, CheckCircle, Table, Camera } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import * as XLSX from 'xlsx';
import { getRoomInfo } from '../data/roomData';

interface MaintenancePageProps {
  complaints: Complaint[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  onImageClick: (image: string) => void;
}

export function MaintenancePage({ complaints, onUpdate, onImageClick }: MaintenancePageProps) {
  // 1단계 필터 (단독 선택)
  const [mainFilterMode, setMainFilterMode] = useState<'영선' | 'CS' | '전체'>('전체');
  // 2단계 필터 (복수 선택)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processDatePopovers, setProcessDatePopovers] = useState<Record<string, boolean>>({});
  const [photoHoverId, setPhotoHoverId] = useState<string | null>(null);
  const [photoHoverImage, setPhotoHoverImage] = useState<string | null>(null);
  const [photoHoverRect, setPhotoHoverRect] = useState<{ left: number; top: number } | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('maintenanceViewMode');
      return (saved as 'card' | 'table') || 'table'; // 기본값을 'table' (상세보기)로 변경
    }
    return 'table'; // 기본값을 'table' (상세보기)로 변경
  });

  // 뷰 모드 변경 시 localStorage에 저장
  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('maintenanceViewMode', mode);
    }
  };

  // 호버 미리보기 위치를 뷰포트 안으로 계산 (다른 웹앱처럼 화면 안에 보이게)
  const getPreviewPosition = (thumbRect: DOMRect): { left: number; top: number } => {
    const gap = 8;
    const pw = 280;
    const ph = 320;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
    let left = thumbRect.left + thumbRect.width / 2 - pw / 2;
    left = Math.max(gap, Math.min(left, vw - pw - gap));
    const spaceAbove = thumbRect.top;
    const spaceBelow = vh - thumbRect.bottom;
    let top: number;
    if (spaceAbove >= ph + gap) {
      top = thumbRect.top - ph - gap;
    } else if (spaceBelow >= ph + gap) {
      top = thumbRect.bottom + gap;
    } else {
      top = Math.max(gap, Math.min(thumbRect.top - ph - gap, vh - ph - gap));
    }
    top = Math.max(gap, Math.min(top, vh - ph - gap));
    return { left, top };
  };

  // 사진 업로드 핸들러 (상세보기에서 추가)
  const handlePhotoUpload = (complaintId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const target = complaints.find(c => c.id === complaintId);
      const existing = target?.사진 || [];
      // 너무 많아지지 않도록 최대 5장까지만 저장
      const updatedPhotos = [...existing, base64].slice(0, 5);
      onUpdate(complaintId, { 사진: updatedPhotos });
    };
    reader.readAsDataURL(file);
  };

  // 영선과 CS 필터링
  const allMaintenanceComplaints = complaints.filter(c => c.구분 === '영선' || c.구분 === 'CS');
  
  // 1단계 필터 적용
  const firstFilteredComplaints = mainFilterMode === '전체'
    ? allMaintenanceComplaints
    : allMaintenanceComplaints.filter(c => {
        if (mainFilterMode === '영선') return c.구분 === '영선';
        if (mainFilterMode === 'CS') return c.구분 === 'CS';
        return true;
      });

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

  const isThisWeek = (dateString: string | undefined) => {
    if (!dateString) return false;
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

  // 필터 토글 함수
  const toggleFilter = (filterKey: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterKey)
        ? prev.filter(f => f !== filterKey)
        : [...prev, filterKey]
    );
  };

  // 2단계 필터 적용 (처리일 기준) - OR 조건
  const filteredComplaints = selectedFilters.length === 0 
    ? firstFilteredComplaints 
    : firstFilteredComplaints.filter(c => {
        return selectedFilters.some(filter => {
          switch (filter) {
            case '오늘':
              return isToday(c.처리일);
            case '내일':
              return isTomorrow(c.처리일);
            case '이번주':
              return isThisWeek(c.처리일);
            case '미처리':
              return c.상태 !== '완료';
            case '우선처리':
              return c.우선처리 === true;
            default:
              return false;
          }
        });
      });

  // 등록일시 기준 정렬 (우선처리로 재정렬하지 않음)
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    return new Date(b.등록일시).getTime() - new Date(a.등록일시).getTime();
  });

  // 각 카테고리별 카운트 (1단계 필터용)
  const categoryCount = {
    전체: allMaintenanceComplaints.length,
    영선: allMaintenanceComplaints.filter(c => c.구분 === '영선').length,
    CS: allMaintenanceComplaints.filter(c => c.구분 === 'CS').length,
  };

  // 2단계 필터 버튼 데이터
  const filterButtons = [
    { key: '오늘', label: '오늘', count: firstFilteredComplaints.filter(c => isToday(c.처리일)).length },
    { key: '내일', label: '내일', count: firstFilteredComplaints.filter(c => isTomorrow(c.처리일)).length },
    { key: '이번주', label: '이번주', count: firstFilteredComplaints.filter(c => isThisWeek(c.처리일)).length },
    { key: '미처리', label: '미처리', count: firstFilteredComplaints.filter(c => c.상태 !== '완료').length },
    { key: '우선처리', label: '우선처리', count: firstFilteredComplaints.filter(c => c.우선처리).length },
  ];

  // 프린트 핸들러
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>영선 민원 리스트</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #1e40af; color: white; }
          .priority { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>영선 민원 리스트</h1>
        <p>출력일시: ${new Date().toLocaleString('ko-KR')}</p>
        <table>
          <thead>
            <tr>
              <th>번호</th>
              <th>우선</th>
              <th>구분</th>
              <th>차수</th>
              <th>호실</th>
              <th>상태</th>
              <th>민원내용</th>
              <th>조치사항</th>
              <th>처리일</th>
            </tr>
          </thead>
          <tbody>
            ${sortedComplaints.map((c, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${c.우선처리 ? '★' : ''}</td>
                <td>${c.구분 === 'CS' ? 'CS' : '영선'}</td>
                <td>${c.차수}차</td>
                <td>${c.호실}호</td>
                <td>${c.상태}</td>
                <td>${c.내용}</td>
                <td>${c.조치사항}</td>
                <td>${c.처리일 ? new Date(c.처리일).toLocaleDateString('ko-KR') : '-'}</td>
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

  // 엑셀 출력 핸들러
  const handleExcelExport = () => {
    const worksheetData = [
      ['번호', '우선처리', '구분', '차수', '호실', '상태', '민원내용', '조치사항', '처리일', '등록일시']
    ];

    sortedComplaints.forEach((c, idx) => {
      worksheetData.push([
        (idx + 1).toString(),
        c.우선처리 ? '★' : '',
        c.구분 === 'CS' ? 'CS' : '영선',
        c.차수 + '차',
        c.호실 + '호',
        c.상태,
        c.내용,
        c.조치사항,
        c.처리일 ? new Date(c.처리일).toLocaleDateString('ko-KR') : '-',
        new Date(c.등록일시).toLocaleString('ko-KR')
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '영선민원');
    
    const fileName = `영선민원_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 우선처리 토글
  const togglePriority = (id: string, current: boolean | undefined) => {
    onUpdate(id, { 우선처리: !current });
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const yy = String(year - 2000).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${yy}.${month}.${day} (${dayName}) ${hours}:${minutes}`;
  };

  const formatProcessDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const yy = String(year - 2000).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${yy}.${month}.${day} (${dayName})`;
  };

  // 상태 색상
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '접수': 'bg-blue-200 text-blue-800 border-blue-400',
      '영선': 'bg-teal-200 text-teal-800 border-teal-400',
      '외부업체': 'bg-indigo-200 text-indigo-800 border-indigo-400',
      '청소': 'bg-sky-500 text-white border-sky-600',
      '퇴실': 'bg-amber-200 text-amber-800 border-amber-400',
      '완료': 'bg-green-200 text-green-800 border-green-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <div className="space-y-3">
      {/* 헤더 & 필터 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-bold text-gray-900">🔨 영선 민원 관리 <span className="text-sm text-gray-500 ml-2">전체 {allMaintenanceComplaints.length}건 | 표시 {sortedComplaints.length}건</span></h2>
          <div className="flex gap-2">
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
            <button
              onClick={handleExcelExport}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
            >
              <FileDown className="w-4 h-4" />
              엑셀
            </button>
          </div>
        </div>

        {/* 1단계 필터: 영선/CS/전체 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-gray-700">필터 선택:</span>
            {(['영선', 'CS', '전체'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  if (mainFilterMode === mode) {
                    setMainFilterMode('전체');
                    setSelectedFilters([]);
                  } else {
                    setMainFilterMode(mode);
                    setSelectedFilters([]);
                  }
                }}
                className={`px-4 py-1.5 rounded text-sm font-bold transition-all border ${
                  mainFilterMode === mode
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {mode} <span className="ml-0.5 text-xs font-medium">({mode === '영선' ? categoryCount.영선 : mode === 'CS' ? categoryCount.CS : categoryCount.전체})</span>
              </button>
            ))}
          </div>

          {/* 2단계 필터: 선택된 경우에만 표시 */}
          {mainFilterMode && mainFilterMode !== '전체' && (
            <div className="pl-5 border-l-4 border-blue-500 space-y-3">
              <div className="text-sm text-gray-600 mb-2">※ 복수 선택 가능 (OR 조건)</div>
              <div className="flex flex-wrap gap-3">
                {filterButtons.map(filter => {
                  const isSelected = selectedFilters.includes(filter.key);
                  return (
                    <button
                      key={filter.key}
                      onClick={() => toggleFilter(filter.key)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all border ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                          : 'bg-white text-gray-700 border-orange-200 hover:bg-orange-50'
                      }`}
                    >
                      {filter.label} <span className="font-bold">({filter.count})</span>
                    </button>
                  );
                })}
                {selectedFilters.length > 0 && (
                  <button
                    onClick={() => setSelectedFilters([])}
                    className="px-3 py-1.5 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                  >
                    전체 보기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 민원 리스트 - 2열 그리드 */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sortedComplaints.map((complaint) => {
            const categoryLabel = complaint.구분 === 'CS' ? 'CS' : '영선';
            return (
              <div
                key={complaint.id}
                className={`bg-white rounded-lg shadow-md border transition-all ${
                  complaint.우선처리 ? 'border-yellow-400 bg-yellow-50' : 
                  complaint.상태 === '완료' ? 'border-gray-200 opacity-50' : 'border-gray-200'
                }`}
              >
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      {/* 우선처리 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePriority(complaint.id, complaint.우선처리);
                        }}
                        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all border-2 ${
                          complaint.우선처리
                            ? 'bg-yellow-400 border-yellow-500 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'
                        }`}
                        title={complaint.우선처리 ? '우선처리 해제' : '우선처리 설정'}
                      >
                        <Star className={`w-4 h-4 ${complaint.우선처리 ? 'fill-current' : ''}`} />
                      </button>

                      <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(complaint.상태)}`}>
                        {complaint.상태}
                      </span>
                      <span className="text-sm font-bold text-gray-700">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full mr-1 text-xs font-semibold ${complaint.구분 === 'CS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {categoryLabel}
                        </span>
                        {complaint.차수}차 {complaint.호실}호
                      </span>
                      <span className="text-xs text-gray-500">
                        처리일: {formatProcessDate(complaint.처리일)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* 완료 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdate(complaint.id, {
                            상태: '완료',
                            완료일시: new Date().toISOString()
                          });
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs font-medium shadow-sm flex-shrink-0 ${
                          complaint.상태 === '완료'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-300 text-white hover:bg-gray-400'
                        }`}
                        title="완료 처리"
                      >
                        {complaint.상태 === '완료' ? '완료' : '완료전'}
                      </button>
                      {expandedId === complaint.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-900 line-clamp-1">{complaint.내용}</p>
                </div>

                {/* 확장 영역 */}
                {expandedId === complaint.id && (
                  <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-3">
                    {/* 호실 정보 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <label className="text-xs font-medium text-gray-700 block mb-2">📋 호실 정보</label>
                      {(() => {
                        const roomInfo = complaints.find(c => c.id === complaint.id);
                        const roomData = roomInfo ? getRoomInfo(roomInfo.차수, roomInfo.호실) : null;
                        return (
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">입주민:</span>
                              <span className="font-medium text-gray-900">{roomData?.입주민 || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">전화번호:</span>
                              {roomData?.전화번호 ? (
                                <a 
                                  href={`tel:${roomData.전화번호}`} 
                                  className="font-medium text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {roomData.전화번호}
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">숙박형태:</span>
                              <span className="font-medium text-gray-900">{roomData?.숙박형태 || '-'}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 민원 내용 */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">민원내용</label>
                      <textarea
                        key={`content-${complaint.id}`}
                        defaultValue={complaint.내용}
                        onBlur={(e) => {
                          if (e.target.value !== complaint.내용) {
                            onUpdate(complaint.id, { 내용: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none"
                        rows={2}
                        placeholder="민원 내용을 입력하세요"
                      />
                    </div>

                    {/* 조치사항 */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">조치사항</label>
                      <textarea
                        key={`action-${complaint.id}`}
                        defaultValue={complaint.조치사항}
                        onBlur={(e) => {
                          if (e.target.value !== complaint.조치사항) {
                            onUpdate(complaint.id, { 조치사항: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none"
                        rows={2}
                        placeholder="조치사항을 입력하세요"
                      />
                    </div>

                    {/* 사진 입력 / 보기 - 버튼 크기 썸네일 + 호버 시 위에 확대 */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">사진</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors shrink-0 h-9 w-9">
                          <Camera className="w-4 h-4 text-gray-500" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(complaint.id, e)}
                            className="hidden"
                          />
                        </label>
                        {complaint.사진 && complaint.사진.length > 0 &&
                          complaint.사진.map((img: string, idx: number) => (
                            <div
                              key={idx}
                              className="relative shrink-0 w-8 h-8 rounded border border-gray-300 overflow-hidden bg-gray-100 cursor-pointer hover:border-blue-500 transition-all"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPhotoHoverId(complaint.id);
                                setPhotoHoverImage(img);
                                setPhotoHoverRect(getPreviewPosition(rect));
                              }}
                              onMouseLeave={() => {
                                setPhotoHoverId(null);
                                setPhotoHoverImage(null);
                                setPhotoHoverRect(null);
                              }}
                            >
                              <img src={img} alt={`첨부 ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* 처리일 입력 */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        처리일 설정
                      </label>
                      <Popover 
                        open={processDatePopovers[complaint.id]} 
                        onOpenChange={(open) => setProcessDatePopovers({...processDatePopovers, [complaint.id]: open})}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center gap-2 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CalendarIcon className="w-5 h-5 text-gray-400" />
                            {complaint.처리일 && (
                              <span className="text-gray-900 text-sm">
                                {formatProcessDate(complaint.처리일)}
                              </span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md bg-white" align="start">
                          <Calendar
                            mode="single"
                            selected={complaint.처리일 ? new Date(complaint.처리일) : undefined}
                            onSelect={(date) => {
                              onUpdate(complaint.id, { 처리일: date?.toISOString() });
                              setProcessDatePopovers({...processDatePopovers, [complaint.id]: false});
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* 상태 변경 */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">상태 변경</label>
                      <div className="flex gap-1 flex-wrap">
                        {['접수', '영선', '외부업체', '청소', '퇴실', '완료'].map((status) => (
                          <button
                            key={status}
                            onClick={(e) => {
                              e.stopPropagation();
                              const updates: Partial<Complaint> = { 상태: status as Complaint['상태'] };
                              if (status === '완료' && !complaint.완료일시) {
                                updates.완료일시 = new Date().toISOString();
                              }
                              onUpdate(complaint.id, updates);
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
                              complaint.상태 === status
                                ? getStatusColor(status)
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 사진 - 버튼 크기 썸네일 + 호버 시 위에 확대 */}
                    {complaint.사진 && complaint.사진.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {complaint.사진.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative shrink-0 w-8 h-8 rounded border border-gray-300 overflow-hidden bg-gray-100 cursor-pointer hover:border-blue-500 transition-all"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setPhotoHoverId(complaint.id);
                              setPhotoHoverImage(img);
                              setPhotoHoverRect(getPreviewPosition(rect));
                            }}
                            onMouseLeave={() => {
                              setPhotoHoverId(null);
                              setPhotoHoverImage(null);
                              setPhotoHoverRect(null);
                            }}
                          >
                            <img src={img} alt={`첨부 ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
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
            );
          })}

          {sortedComplaints.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500">해당 조건의 영선 민원이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 민원 리스트 - 테이블 */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="w-full border-collapse min-w-[1000px]" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">번호</th>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">우선</th>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">구분</th>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">차수</th>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">호실</th>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">상태</th>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">민원내용</th>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">조치사항</th>
                <th className="px-0.5 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-[72px]">처리일</th>
                <th className="px-1 py-1.5 bg-blue-700 text-white text-center font-medium whitespace-nowrap">사진</th>
              </tr>
            </thead>
            <tbody>
              {sortedComplaints.map((complaint, index) => {
                const categoryLabel = complaint.구분 === 'CS' ? 'CS' : '영선';
                return (
                  <tr key={complaint.id} className={`border-b border-gray-200 transition-colors ${complaint.우선처리 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}`}>
                    <td className="px-1 py-1 text-gray-900 whitespace-nowrap text-center">{index + 1}</td>
                    <td className="px-1 py-1 whitespace-nowrap text-center">
                      <div className="flex justify-center">
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
                      </div>
                    </td>
                    <td className="px-1 py-1 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${complaint.구분 === 'CS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {categoryLabel}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-gray-900 whitespace-nowrap text-center">{complaint.차수}차</td>
                    <td className="px-1 py-1 text-gray-900 whitespace-nowrap text-center">{complaint.호실}호</td>
                    <td className="px-1 py-1 whitespace-nowrap text-center">
                      <select
                        value={complaint.상태}
                        onChange={(e) => {
                          const status = e.target.value as Complaint['상태'];
                          const updates: Partial<Complaint> = { 상태: status };
                          if (status === '완료' && !complaint.완료일시) {
                            updates.완료일시 = new Date().toISOString();
                          }
                          onUpdate(complaint.id, updates);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 bg-white"
                      >
                        <option value="접수">접수</option>
                        <option value="영선">영선</option>
                        <option value="외부업체">외부업체</option>
                        <option value="청소">청소</option>
                        <option value="퇴실">퇴실</option>
                        <option value="완료">완료</option>
                      </select>
                    </td>
                    <td className="px-1 py-1 text-center" style={{ maxWidth: '200px' }}>
                      <textarea
                        key={`content-${complaint.id}`}
                        defaultValue={complaint.내용}
                        onBlur={(e) => {
                          if (e.target.value !== complaint.내용) {
                            onUpdate(complaint.id, { 내용: e.target.value });
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 resize-none text-center"
                        style={{ fontSize: '13px' }}
                        rows={1}
                        placeholder="민원 내용"
                      />
                    </td>
                    {/* 조치사항 */}
                    <td className="px-1 py-1 text-center" style={{ maxWidth: '200px' }}>
                      <textarea
                        key={`action-${complaint.id}`}
                        defaultValue={complaint.조치사항}
                        onBlur={(e) => {
                          if (e.target.value !== complaint.조치사항) {
                            onUpdate(complaint.id, { 조치사항: e.target.value });
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 resize-none text-center"
                        style={{ fontSize: '13px' }}
                        rows={1}
                        placeholder="조치사항"
                      />
                    </td>
                    {/* 처리일 */}
                    <td className="px-0.5 py-1 whitespace-nowrap w-[72px]">
                      <div className="flex justify-center">
                        <Popover
                          open={processDatePopovers[complaint.id]}
                          onOpenChange={(open) => setProcessDatePopovers({...processDatePopovers, [complaint.id]: open})}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="w-full min-w-0 px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center justify-center gap-0.5 whitespace-nowrap"
                              style={{ fontSize: '12px' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CalendarIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className={complaint.처리일 ? 'text-gray-900' : 'text-gray-500 truncate'}>
                                {complaint.처리일 ? formatProcessDate(complaint.처리일) : '날짜'}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md" align="start">
                            <Calendar
                              mode="single"
                              selected={complaint.처리일 ? new Date(complaint.처리일) : undefined}
                              onSelect={(date) => {
                                onUpdate(complaint.id, { 처리일: date?.toISOString() });
                                setProcessDatePopovers({...processDatePopovers, [complaint.id]: false});
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </td>
                    {/* 사진 - 버튼 크기 썸네일 + 호버 시 위에 확대 */}
                    <td className="px-1 py-1 align-top">
                      <div className="flex items-center gap-1.5">
                        {complaint.사진 && complaint.사진.length > 0 ? (
                          complaint.사진.map((img: string, idx: number) => (
                            <div
                              key={idx}
                              className="relative shrink-0 w-8 h-8 rounded border border-gray-300 overflow-hidden bg-gray-100 cursor-pointer hover:border-blue-500 transition-all"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPhotoHoverId(complaint.id);
                                setPhotoHoverImage(img);
                                setPhotoHoverRect(getPreviewPosition(rect));
                              }}
                              onMouseLeave={() => {
                                setPhotoHoverId(null);
                                setPhotoHoverImage(null);
                                setPhotoHoverRect(null);
                              }}
                            >
                              <img src={img} alt={`첨부 ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))
                        ) : null}
                        <label className="inline-flex items-center justify-center px-1.5 py-1 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs shrink-0 h-9 w-9">
                          <Camera className="w-4 h-4 text-gray-600" />
                          <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(complaint.id, e)} className="hidden" />
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* 호버 시 사진 확대 미리보기 (전역 1개) */}
      {photoHoverImage && photoHoverRect && (
        <div
          className="fixed z-50 rounded-lg border border-gray-300 bg-white shadow-xl overflow-hidden pointer-events-none"
          style={{
            width: 280,
            maxHeight: 320,
            left: photoHoverRect.left,
            top: photoHoverRect.top,
          }}
        >
          <img src={photoHoverImage} alt="확대" className="w-full h-auto object-contain max-h-[320px]" />
        </div>
      )}
    </div>
  );
}