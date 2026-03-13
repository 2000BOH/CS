import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Printer, Download, ChevronLeft, ChevronRight, Table } from 'lucide-react';
import type { Complaint } from '../App';
import { getRoomInfo } from '../data/roomData';
import { DateCell } from './DateCell';
import { formatShortDate, formatTime, formatDateTime, dateToFullString } from '../utils/dateFormat';

interface ComplaintListProps {
  complaints: Complaint[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  selectedStatus: string | null;
  selectedCategory: string | null;
  onImageClick: (imageUrl: string) => void;
  isDesktopWide?: boolean;
}

// 등록자 ID를 이름으로 변환하는 함수
const getUserName = (userId: string): string => {
  const userMap: Record<string, string> = {
    '01': '수용',
    '02': '동훈',
    '03': '시우',
    '04': '현석',
    '05': '아름',
    '06': '남식',
    '07': '영선',
    '08': '관리사무소',
    '09': '키핑'
  };
  return userMap[userId] || userId;
};

export function ComplaintList({ complaints, onUpdate, selectedStatus, selectedCategory, onImageClick, isDesktopWide }: ComplaintListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      // 모바일에서는 무조건 table 모드
      const isMobile = window.innerWidth < 768;
      if (isMobile) return 'table';
      
      const saved = localStorage.getItem('complaintViewMode');
      return (saved as 'card' | 'table') || 'card';
    }
    return 'card';
  });
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [datePopovers, setDatePopovers] = useState<Record<string, { 연락일: boolean; 조치일: boolean }>>({});
  const itemsPerPage = 20;

  // 뷰 모드 변경 시 localStorage에 저장
  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('complaintViewMode', mode);
    }
  };

  // complaints가 변경되면 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [complaints.length, selectedStatus, selectedCategory]);

  // 페이징 계산
  const totalPages = Math.ceil(complaints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedComplaints = complaints.slice(startIndex, endIndex);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '접수':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case '영선팀':
        return <Clock className="w-5 h-5 text-teal-500" />;
      case '진행중':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case '부서이관':
        return <AlertCircle className="w-5 h-5 text-purple-500" />;
      case '외부업체':
        return <AlertCircle className="w-5 h-5 text-indigo-500" />;
      case '완료':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '접수':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case '영선팀':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case '진행중':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case '부서이관':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case '외부업체':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case '완료':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleStatusChange = (id: string, newStatus: Complaint['상태']) => {
    const updates: Partial<Complaint> = { 상태: newStatus };

    // 상태에 따라 구분 자동 매핑 (전페이지 공통 상태 유지)
    if (newStatus === '영선팀') {
      updates.구분 = '영선';
    } else if (newStatus === '청소요청') {
      updates.구분 = '청소';
    }

    if (newStatus === '완료') {
      updates.완료일시 = new Date().toISOString();
    }
    onUpdate(id, updates);
  };

  const getTitle = () => {
    if (selectedStatus && selectedCategory) {
      return `${selectedStatus} - ${selectedCategory}`;
    }
    if (selectedStatus) {
      return `${selectedStatus} 민원`;
    }
    if (selectedCategory) {
      return selectedCategory;
    }
    return '전체 민원';
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>민원 목록 출력 - ${getTitle()}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: 'Malgun Gothic', sans-serif;
            padding: 20px;
            font-size: 12px;
          }
          h1 {
            font-size: 18px;
            margin-bottom: 10px;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .status {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
          }
          .status-접수 { background-color: #dbeafe; color: #1e40af; }
          .status-영선팀 { background-color: #ccfbf1; color: #0f766e; }
          .status-진행중 { background-color: #fed7aa; color: #c2410c; }
          .status-부서이관 { background-color: #e9d5ff; color: #6b21a8; }
          .status-외부업체 { background-color: #c7d2fe; color: #4338ca; }
          .status-완료 { background-color: #bbf7d0; color: #15803d; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${getTitle()} (${complaints.length}건)</h1>
        <p>출력일시: ${new Date().toLocaleString('ko-KR')}</p>
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">번호</th>
              <th style="width: 60px;">차수</th>
              <th style="width: 70px;">호실</th>
              <th style="width: 90px;">구분</th>
              <th style="width: 80px;">처리상태</th>
              <th>민원내용</th>
              <th>조치사항</th>
              <th style="width: 130px;">조치일</th>
            </tr>
          </thead>
          <tbody>
            ${complaints.map((complaint, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${complaint.차수}차</td>
                <td>${complaint.호실}호</td>
                <td>${complaint.구분}</td>
                <td><span class="status status-${complaint.상태}">${complaint.상태}</span></td>
                <td>${complaint.내용}</td>
                <td>${complaint.조치사항 || '-'}</td>
                <td>${complaint.조치일 ? new Date(complaint.조치일).toLocaleDateString('ko-KR') : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // 페이지 로드 후 프린트 대화상자 표시
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const handleExcelExport = async () => {
    // SheetJS를 사용하여 XLSX 파일 생성
    const XLSX = await import('xlsx');
    
    // 데이터를 시트 형식으로 변환
    const worksheetData = [
      ['번호', '차수', '호실', '구분', '처리상태', '민원내용', '조치사항', '조치일']
    ];
    
    complaints.forEach((complaint, index) => {
      worksheetData.push([
        index + 1,
        complaint.차수,
        complaint.호실,
        complaint.구분,
        complaint.상태,
        complaint.내용,
        complaint.조치사항 || '-',
        complaint.조치일 ? new Date(complaint.조치일).toLocaleDateString('ko-KR') : '-'
      ]);
    });
    
    // 워크시트 생성
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '민원목록');
    
    // 파일 다운로드
    XLSX.writeFile(workbook, `민원목록_${getTitle()}_${new Date().toLocaleDateString('ko-KR')}.xlsx`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">
          {getTitle()} ({complaints.length}건)
        </h2>
        {complaints.length > 0 && (
          <div className="hidden lg:flex gap-3">
            <button
              onClick={() => handleViewModeChange(viewMode === 'card' ? 'table' : 'card')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
            >
              <Table className="w-4 h-4" />
              {viewMode === 'card' ? '상세보기' : '카드보기'}
            </button>
            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              엑셀 출력
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              프린트
            </button>
          </div>
        )}
      </div>

      {complaints.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <AlertCircle className="w-14 h-14 mx-auto mb-3 opacity-50" />
          <p className="text-base">민원이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 데스크톱: 그리드 레이아웃 (4열) */}
          {viewMode === 'card' && (
            <div className={`hidden ${isDesktopWide ? 'lg:grid lg:grid-cols-4' : 'lg:grid lg:grid-cols-2'} gap-3`}>
              {paginatedComplaints.map((complaint) => {
                const roomInfo = getRoomInfo(complaint.차수, complaint.호실);
                
                return (
                  <div
                    key={complaint.id}
                    className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all ${complaint.상태 === '완료' ? 'opacity-50' : ''}`}
                  >
                    <div
                      className="p-2.5 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                            {getStatusIcon(complaint.상태)}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(complaint.상태)}`}>
                              {complaint.상태}
                            </span>
                            <span className="text-sm font-bold text-gray-700">
                              {complaint.차수}차 {complaint.호실}호
                            </span>
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                              {complaint.구분}
                            </span>
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                              {getUserName(complaint.등록자)}
                            </span>
                            <span className="text-[10px] text-gray-500 cursor-help" title={formatTime(complaint.등록일시)}>
                              {formatShortDate(complaint.등록일시)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-1 text-[10px] text-gray-500">
                            {complaint.사진 && complaint.사진.length > 0 && (
                              <div className="flex gap-1 ml-1">
                                {complaint.사진.slice(0, 2).map((img, idx) => (
                                  <img 
                                    key={idx}
                                    src={img} 
                                    alt={`첨부 ${idx + 1}`} 
                                    className="w-8 h-8 object-cover rounded border border-gray-300 cursor-pointer hover:border-blue-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onImageClick(img);
                                    }}
                                  />
                                ))}
                                {complaint.사진.length > 2 && (
                                  <span className="text-[9px] text-gray-400">+{complaint.사진.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-900 line-clamp-2 mt-1">{complaint.내용}</p>
                        </div>
                        <button className="ml-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                          {expandedId === complaint.id ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {expandedId === complaint.id && (
                      <div className="px-3 pb-3 border-t border-gray-100 pt-3 bg-gray-50">
                        <div className="space-y-3">
                          {/* 호실 정보 박스 */}
                          <div className="bg-white border border-gray-200 rounded-lg p-3">
                            <label className="text-xs font-medium text-gray-700 block mb-2">📋 호실 정보</label>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">입주민:</span>
                                <span className="font-medium text-gray-900">{roomInfo?.입주민 || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">전화번호:</span>
                                {roomInfo?.전화번호 ? (
                                  <a 
                                    href={`tel:${roomInfo.전화번호}`} 
                                    className="font-medium text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {roomInfo.전화번호}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">타입:</span>
                                <span className="font-medium text-gray-900">{roomInfo?.타입 || complaint.타입 || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">숙박형태:</span>
                                <span className="font-medium text-gray-900">{roomInfo?.숙박형태 || '-'}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              민원내용
                            </label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap bg-white border border-gray-200 rounded-md p-2">
                              {complaint.내용}
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              조치사항
                            </label>
                            <textarea
                              key={`card-action-${complaint.id}`}
                              defaultValue={
                                complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                  ? complaint.객실이동조치 || ''
                                  : complaint.구분 === '청소'
                                  ? complaint.객실정비조치 || ''
                                  : complaint.조치사항 || ''
                              }
                              onBlur={(e) => {
                                const field = complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                  ? '객실이동조치'
                                  : complaint.구분 === '청소'
                                  ? '객실정비조치'
                                  : '조치사항';
                                const current = complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                  ? complaint.객실이동조치 || ''
                                  : complaint.구분 === '청소'
                                  ? complaint.객실정비조치 || ''
                                  : complaint.조치사항 || '';
                                if (e.target.value !== current) onUpdate(complaint.id, { [field]: e.target.value });
                              }}
                              placeholder="조치사항을 입력하세요"
                              rows={2}
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-2">
                              처리상태 변경
                            </label>
                            <select
                              value={complaint.상태}
                              onChange={(e) => handleStatusChange(complaint.id, e.target.value as Complaint['상태'])}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="접수">접수</option>
                              <option value="영선팀">영선팀</option>
                              <option value="진행중">진행중</option>
                              <option value="부서이관">부서이관</option>
                              <option value="외부업체">외부업체</option>
                              <option value="청소요청">청소요청</option>
                              <option value="완료">완료</option>
                            </select>
                          </div>

                          {complaint.완료일시 && (
                            <div className="text-xs text-gray-500 pt-2 border-t">
                              완료일시: 
                              <span 
                                className="cursor-help ml-1" 
                                title={formatTime(complaint.완료일시)}
                              >
                                {formatShortDate(complaint.완료일시)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 모바일: 단일 열 레이아웃 */}
          {viewMode === 'card' && (
            <div className="lg:hidden space-y-3">
              {paginatedComplaints.map((complaint) => {
                const roomInfo = getRoomInfo(complaint.차수, complaint.호실);
                
                return (
                  <div
                    key={complaint.id}
                    className={`border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${complaint.상태 === '완료' ? 'opacity-50' : ''}`}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {getStatusIcon(complaint.상태)}
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(complaint.상태)}`}>
                              {complaint.상태}
                            </span>
                            <span className="text-sm font-bold text-gray-700">
                              {complaint.차수}차 {complaint.호실}호
                            </span>
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                              {complaint.구분}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {getUserName(complaint.등록자)}
                            </span>
                            <span className="text-xs text-gray-500">{formatShortDate(complaint.등록일시)}</span>
                            {complaint.사진 && complaint.사진.length > 0 && (
                              <div className="flex gap-1">
                                {complaint.사진.map((img, idx) => (
                                  <img 
                                    key={idx}
                                    src={img} 
                                    alt={`첨부 ${idx + 1}`} 
                                    className="w-8 h-8 object-cover rounded border-2 border-gray-300 cursor-pointer hover:border-blue-500 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onImageClick(img);
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          {roomInfo && (
                            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                              <span>{roomInfo.입주민} ({roomInfo.전화번호}) - {roomInfo.숙박형태}</span>
                            </div>
                          )}
                          <p className="text-xs text-gray-900 line-clamp-1">{complaint.내용}</p>
                        </div>
                        <button className="ml-2 text-gray-400 hover:text-gray-600">
                          {expandedId === complaint.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {expandedId === complaint.id && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                        <div className="space-y-3">
                          {/* 호실 정보 박스 */}
                          <div className="bg-white border border-gray-200 rounded-lg p-3">
                            <label className="text-xs font-medium text-gray-700 block mb-2">📋 호실 정보</label>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">입주민:</span>
                                <span className="font-medium text-gray-900">{roomInfo?.입주민 || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">전화번호:</span>
                                {roomInfo?.전화번호 ? (
                                  <a 
                                    href={`tel:${roomInfo.전화번호}`} 
                                    className="font-medium text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {roomInfo.전화번호}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">타입:</span>
                                <span className="font-medium text-gray-900">{roomInfo?.타입 || complaint.타입 || '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">숙박형태:</span>
                                <span className="font-medium text-gray-900">{roomInfo?.숙박형태 || '-'}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              민원내용
                            </label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap bg-white border border-gray-200 rounded-md p-2">
                              {complaint.내용}
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              조치사항
                            </label>
                            <textarea
                              key={`card-action-2-${complaint.id}`}
                              defaultValue={
                                complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                  ? complaint.객실이동조치 || ''
                                  : complaint.구분 === '청소'
                                  ? complaint.객실정비조치 || ''
                                  : complaint.조치사항 || ''
                              }
                              onBlur={(e) => {
                                const field = complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                  ? '객실이동조치'
                                  : complaint.구분 === '청소'
                                  ? '객실정비조치'
                                  : '조치사항';
                                const current = complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                  ? complaint.객실이동조치 || ''
                                  : complaint.구분 === '청소'
                                  ? complaint.객실정비조치 || ''
                                  : complaint.조치사항 || '';
                                if (e.target.value !== current) onUpdate(complaint.id, { [field]: e.target.value });
                              }}
                              placeholder="조치사항을 입력하세요"
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-2">
                              처리상태 변경
                            </label>
                            <select
                              value={complaint.상태}
                              onChange={(e) => handleStatusChange(complaint.id, e.target.value as Complaint['상태'])}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="접수">접수</option>
                              <option value="영선팀">영선팀</option>
                              <option value="진행중">진행중</option>
                              <option value="부서이관">부서이관</option>
                              <option value="외부업체">외부업체</option>
                              <option value="청소요청">청소요청</option>
                              <option value="완료">완료</option>
                            </select>
                          </div>

                          {complaint.완료일시 && (
                            <div className="text-xs text-gray-500 pt-2 border-t">
                              완료일시: {formatDateTime(complaint.완료일시)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 테이블 뷰 */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
              <table className="w-full border-collapse min-w-[1200px]" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th className="px-0.5 py-1 text-center font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[70px]">상태</th>
                    <th className="px-0.5 py-1 text-center font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[50px]">차수</th>
                    <th className="px-0.5 py-1 text-center font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[70px]">호실</th>
                    <th className="px-0.5 py-1.5 text-left font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[70px]">구분</th>
                    <th className="px-0.5 py-1.5 text-left font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[70px]">등록자</th>
                    <th className="px-1 py-1.5 text-left font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[110px]">등록일시</th>
                    <th className="px-1 py-1.5 text-left font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[110px]">연락일</th>
                    <th className="px-1 py-1.5 text-left font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[110px]">조치일</th>
                    <th className="px-2 py-1.5 text-left font-medium bg-blue-700 text-white border-b whitespace-nowrap min-w-[220px]">내용</th>
                    <th className="px-2 py-1.5 text-left font-medium bg-blue-700 text-white border-b whitespace-nowrap min-w-[220px]">조치사항</th>
                    <th className="px-1 py-1.5 text-left font-medium bg-blue-700 text-white border-b whitespace-nowrap w-[70px]">사진</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedComplaints.map((complaint) => {
                    return (
                      <tr key={complaint.id} className="border-b border-gray-300 hover:bg-gray-50">
                        <td className="px-0.5 py-1 whitespace-nowrap text-center">{editingCell?.id === complaint.id && editingCell.field === '상태' ? (
                          <select
                            value={complaint.상태}
                            onChange={(e) => {
                              handleStatusChange(complaint.id, e.target.value as any);
                              setEditingCell(null);
                            }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-[68px] px-1.5 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ fontSize: '13px' }}
                          >
                            <option value="접수">접수</option>
                            <option value="영선팀">영선팀</option>
                            <option value="진행중">진행중</option>
                            <option value="부서이관">부서이관</option>
                            <option value="외부업체">외부업체</option>
                            <option value="완료">완료</option>
                          </select>
                        ) : (
                          <span 
                            className={`inline-block px-2 py-1 rounded font-medium border cursor-pointer ${getStatusColor(complaint.상태)}`}
                            onClick={() => setEditingCell({ id: complaint.id, field: '상태' })}
                          >
                            {complaint.상태}
                          </span>
                        )}</td>
                        <td className="px-0.5 py-1 font-medium text-gray-900 whitespace-nowrap text-center">{complaint.차수}차</td>
                        <td className="px-0.5 py-1 font-medium text-gray-900 whitespace-nowrap text-center">{complaint.호실}호</td>
                        <td className="px-0.5 py-1.5 whitespace-nowrap">{editingCell?.id === complaint.id && editingCell.field === '구분' ? (
                          <select
                            value={complaint.구분}
                            onChange={(e) => {
                              onUpdate(complaint.id, { 구분: e.target.value as any });
                              setEditingCell(null);
                            }}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{ fontSize: '13px' }}
                          >
                            <option value="영선">영선</option>
                            <option value="CS">CS</option>
                            <option value="입실">입실</option>
                            <option value="퇴실">퇴실</option>
                            <option value="청소">청소</option>
                          </select>
                        ) : (
                          <span 
                            className="px-2 py-1 rounded bg-gray-100 text-gray-700 cursor-pointer"
                            onClick={() => setEditingCell({ id: complaint.id, field: '구분' })}
                          >
                            {complaint.구분}
                          </span>
                        )}</td>
                        <td className="px-0.5 py-1.5 whitespace-nowrap">
                          <span className="block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs text-center border border-blue-100">
                            {getUserName(complaint.등록자)}
                          </span>
                        </td>
                        <td className="px-1 py-1.5 text-gray-600 whitespace-nowrap">
                          <span className="block px-2 py-1 bg-white border border-gray-300 rounded text-center">
                            {formatShortDate(complaint.등록일시)}
                          </span>
                        </td>
                        <td className="px-1 py-1.5 text-gray-600 whitespace-nowrap">
                          <DateCell
                            date={complaint.연락일}
                            onDateChange={(date) => onUpdate(complaint.id, { 연락일: date })}
                            popoverOpen={datePopovers[complaint.id]?.연락일 || false}
                            onPopoverOpenChange={(open) => setDatePopovers({
                              ...datePopovers,
                              [complaint.id]: { ...datePopovers[complaint.id], 연락일: open }
                            })}
                          />
                        </td>
                        <td className="px-1 py-1.5 text-gray-600 whitespace-nowrap">
                          <DateCell
                            date={complaint.조치일}
                            onDateChange={(date) => onUpdate(complaint.id, { 조치일: date })}
                            popoverOpen={datePopovers[complaint.id]?.조치일 || false}
                            onPopoverOpenChange={(open) => setDatePopovers({
                              ...datePopovers,
                              [complaint.id]: { ...datePopovers[complaint.id], 조치일: open }
                            })}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap align-top" style={{ maxWidth: '260px' }}>{editingCell?.id === complaint.id && editingCell.field === '내용' ? (
                          <textarea
                            key={`table-content-${complaint.id}`}
                            defaultValue={complaint.내용}
                            onBlur={(e) => {
                              if (e.target.value !== complaint.내용) onUpdate(complaint.id, { 내용: e.target.value });
                              setEditingCell(null);
                            }}
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            style={{ fontSize: '13px' }}
                          />
                        ) : (
                          <div 
                            className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-gray-200 bg-white truncate"
                            onClick={() => setEditingCell({ id: complaint.id, field: '내용' })}
                            title={complaint.내용}
                          >
                            {complaint.내용}
                          </div>
                        )}</td>
                        <td className="px-2 py-1.5 text-gray-900 whitespace-nowrap align-top" style={{ maxWidth: '260px' }}>{editingCell?.id === complaint.id && editingCell.field === '조치사항' ? (
                          <textarea
                            key={`table-action-${complaint.id}`}
                            defaultValue={
                              complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                ? complaint.객실이동조치 || ''
                                : complaint.구분 === '청소'
                                ? complaint.객실정비조치 || ''
                                : complaint.조치사항 || ''
                            }
                            onBlur={(e) => {
                              const field = complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                ? '객실이동조치'
                                : complaint.구분 === '청소'
                                ? '객실정비조치'
                                : '조치사항';
                              const current = complaint.구분 === '입실' || complaint.구분 === '퇴실'
                                ? complaint.객실이동조치 || ''
                                : complaint.구분 === '청소'
                                ? complaint.객실정비조치 || ''
                                : complaint.조치사항 || '';
                              if (e.target.value !== current) onUpdate(complaint.id, { [field]: e.target.value });
                              setEditingCell(null);
                            }}
                            placeholder="조치사항 입력"
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            style={{ fontSize: '13px' }}
                          />
                        ) : (
                          <div 
                            className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-gray-200 bg-white truncate"
                            onClick={() => setEditingCell({ id: complaint.id, field: '조치사항' })}
                            title={complaint.구분 === '입실' || complaint.구분 === '퇴실'
                              ? complaint.객실이동조치 || '-'
                              : complaint.구분 === '청소'
                              ? complaint.객실정비조치 || '-'
                              : complaint.조치사항 || '-'}
                          >
                            {complaint.구분 === '입실' || complaint.구분 === '퇴실'
                              ? complaint.객실이동조치 || '-'
                              : complaint.구분 === '청소'
                              ? complaint.객실정비조치 || '-'
                              : complaint.조치사항 || '-'}
                          </div>
                        )}</td>
                        <td className="px-2 py-1.5 text-center whitespace-nowrap">
                          {complaint.사진 && complaint.사진.length > 0 ? (
                            <button
                              onClick={() => onImageClick(complaint.사진![0])}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              {complaint.사진.length}
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 페이징 버튼 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </button>
              <span className="text-sm text-gray-600 px-3">
                {currentPage} / {totalPages} 페이지
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}