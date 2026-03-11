import { useState, useMemo } from 'react';
import { Complaint, RoomInfo } from '../App';
import { Star, Calendar as CalendarIcon, ChevronDown, ChevronUp, Printer, FileDown, Table, FileText, Upload, File, Download, X } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import * as XLSX from 'xlsx';

interface RoomMovePageProps {
  complaints: Complaint[];
  rooms: RoomInfo[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  onRoomUpdate: (차수: string, 호수: string, updates: Partial<RoomInfo>) => void;
  onRoomMoveDataUpdate: (차수: string, 호실: string, updates: Partial<Complaint>) => void;
  onImageClick: (image: string) => void;
}

// 객실이동 데이터 타입
interface RoomMoveData {
  id: string; // 실제 complaint ID (있는 경우) 또는 임시 ID
  차수: string;
  호실: string;
  구분: string;
  내용: string;
  객실이동조치?: string; // 객실이동 조치 전용 필드
  관리사무소확인?: boolean; // 관리사무소 체크박스
  상태: string;
  등록일시: string;
  등록자: string;
  운영종료일?: string;
  입주일?: string;
  퇴실상태?: '준비' | '연락' | '퇴실' | '계약서' | '완료';
  이사일?: string;
  사진?: string[];
  완료일시?: string;
  우선처리?: boolean;
  hasComplaint: boolean; // 실제 원이 존재하는지 여부
  타입?: string; // 객실정보의 타입
  계약서파일?: string; // 계약서 파일 base64
  계약서파일명?: string; // 계약서 파일 이름
}

export function RoomMovePage({ complaints, rooms, onUpdate, onRoomUpdate, onRoomMoveDataUpdate, onImageClick }: RoomMovePageProps) {
  const [mainFilterMode, setMainFilterMode] = useState<'자산관리' | '관리사무소' | null>(null); // 메인 필터 모드
  const [assetFilters, setAssetFilters] = useState<string[]>([]); // 자산관리 필터 (복수 선택)
  const [officeFilter, setOfficeFilter] = useState<string | null>(null); // 관리사무소 필터 (단독 선택)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [moveDatePopovers, setMoveDatePopovers] = useState<Record<string, boolean>>({});
  const [endDatePopovers, setEndDatePopovers] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      // 모바일에서는 무조건 table 모드
      const isMobile = window.innerWidth < 768;
      if (isMobile) return 'table';
      
      const saved = localStorage.getItem('roomMoveViewMode');
      return (saved as 'card' | 'table') || 'table'; // 기본값을 'table'로 변경
    }
    return 'table'; // 기본값을 'table'로 변경
  });
  const [localActionText, setLocalActionText] = useState<Record<string, string>>({}); // 조치사항 로컬 상태

  // 뷰 모드 변경 시 localStorage에 저장
  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('roomMoveViewMode', mode);
    }
  };

  // 메인 필터 모드 변경 핸들러
  const handleMainFilterModeChange = (mode: '자산관리' | '관리사무소') => {
    if (mainFilterMode === mode) {
      // 같은 모드를 다시 클릭하면 초기화
      setMainFilterMode(null);
      setAssetFilters([]);
      setOfficeFilter(null);
    } else {
      setMainFilterMode(mode);
      setAssetFilters([]);
      setOfficeFilter(null);
    }
  };

  // 🔥 핵심 로직: 입실/퇴실 민원 + rooms의 운영종료일을 기준으로 데이터 병합
  const roomMoveDataList: RoomMoveData[] = useMemo(() => {
    console.log('🔄 roomMoveDataList 재계산 시작');
    console.log('📊 rooms:', rooms.length, 'complaints:', complaints.length);
    
    const result: RoomMoveData[] = [];
    const processedKeys = new Set<string>(); // 중복 방지용
    
    // 1️⃣ 먼저 구분이 '입실' 또는 '퇴실'인 민원을 추가
    complaints
      .filter(c => c.구분 === '입실' || c.구분 === '퇴실')
      .forEach(complaint => {
        const 차수숫자 = complaint.차수.replace(/[^0-9]/g, '');
        const 호실숫자 = complaint.호실.replace(/[^0-9]/g, '');
        const uniqueKey = `${차수숫자}-${호실숫자}`;
        
        if (!processedKeys.has(uniqueKey)) {
          console.log('✅ 입실/퇴실 민원 발견:', complaint.차수, complaint.호실, complaint.구분);
          processedKeys.add(uniqueKey);
          result.push({
            ...complaint,
            hasComplaint: true,
          });
        }
      });
    
    // 2️⃣ rooms의 운영종료일을 기준으로 데이터 병합
    rooms
      .filter(room => room.운영종료일) // 운영종료일이 있는 객실만
      .forEach(room => {
        // 차수+호실 정규화
        const 차수숫자 = room.차수.replace(/[^0-9]/g, '');
        const 호실숫자 = room.호수.replace(/[^0-9]/g, '');
        const uniqueKey = `${차수숫자}-${호실숫자}`;
        
        // 이미 처리한 차수+호실이면 스킵
        if (processedKeys.has(uniqueKey)) {
          console.log('⚠️ 중복 차수+호실 발견, 스킵:', room.차수, room.호수);
          return;
        }
        processedKeys.add(uniqueKey);
        
        // 해당 차수+호실의 민원 찾기 (운영종료일이 있는 민원)
        const matchedComplaint = complaints.find(c => {
          const c차수 = c.차수.replace(/[^0-9]/g, '');
          const c호실 = c.호실.replace(/[^0-9]/g, '');
          return c차수 === 차수숫자 && c호실 === 호실숫자 && c.운영종료일;
        });
        
        if (matchedComplaint) {
          // 실제 민원이 있는 경우: 민원 데이터 사용
          console.log('✅ 민원 발견:', room.차수, room.호수, matchedComplaint.id);
          result.push({
            ...matchedComplaint,
            hasComplaint: true,
          });
        } else {
          // 민원이 없는 경우: 객실정보로 가상 데이터 생성
          console.log('📌 민원 없음 (가상):', room.차수, room.호수);
          result.push({
            id: `mock-${room.차수}-${room.호수}`, // 유니크한 ID 생성
            차수: room.차수,
            호실: room.호수,
            구분: '퇴실' as const,
            내용: room.타입 || '객실 퇴실',
            객실이동조치: room.숙박형태 || '',
            상태: '접수' as const,
            등록일시: new Date().toISOString(),
            등록자: 'system',
            운영종료일: room.운영종료일,
            입주일: room.임차인,
            퇴실상태: '준비' as const,
            hasComplaint: false, // 가상 데이터 표시
            타입: room.타입,
          });
        }
      });
    
    return result;
  }, [rooms, complaints]);

  console.log('📋 최종 roomMoveDataList:', roomMoveDataList.length, '개');

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

  const isThisMonth = (dateString: string | undefined) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  // 필터 토글 함수
  const toggleAssetFilter = (filterKey: string) => {
    setAssetFilters(prev =>
      prev.includes(filterKey)
        ? prev.filter(f => f !== filterKey)
        : [...prev, filterKey]
    );
  };

  // 필터 적용 로직
  const filteredData = useMemo(() => {
    if (mainFilterMode === '자산관리' && assetFilters.length > 0) {
      // 자산관리 모드: OR 조건으로 복수 선택 가능
      return roomMoveDataList.filter(data => {
        return assetFilters.some(filter => {
          if (filter === '완료') return data.관리사무소확인 === true;
          if (filter === '미완료') return !data.관리사무소확인;
          if (filter === '오늘') return isToday(data.운영종료일);
          if (filter === '내일') return isTomorrow(data.운영종료일);
          if (filter === '이번주') return isThisWeek(data.운영종료일);
          if (filter === '이번달') return isThisMonth(data.운영종료일);
          if (filter === '우선처리') return data.우선처리 === true;
          return false;
        });
      });
    } else if (mainFilterMode === '관리사무소' && officeFilter) {
      // 관리사무소 모드: 퇴실상태가 "완료"인 것만 표시
      return roomMoveDataList.filter(data => {
        // 퇴실상태가 "완료"가 아니면 제외
        if (data.퇴실상태 !== '완료') return false;
        
        // "1차 완료", "1차 미완료" 등의 형식
        const [차수, 상태] = officeFilter.split(' ');
        const 차수매치 = data.차수.includes(차수.replace('차', ''));
        const 상태매치 = 상태 === '완료' ? data.관리사무소확인 === true : !data.관리사무소확인;
        return 차수매치 && 상태매치;
      });
    } else {
      // 필터가 선택되지 않은 경우 전체 표시
      return roomMoveDataList;
    }
  }, [mainFilterMode, assetFilters, officeFilter, roomMoveDataList]);

  // 정렬 (우선처리로 재정렬하지 않음 - 원래 순서 유지)
  const sortedData = [...filteredData].sort((a, b) => {
    // 운영종료일이 빠른 순으로 정렬
    if (a.운영종료일 && b.운영종료일) {
      return new Date(a.운영종료일).getTime() - new Date(b.운영종료일).getTime();
    }
    if (a.운영종료일) return -1;
    if (b.운영종료일) return 1;
    
    return new Date(b.등록일시).getTime() - new Date(a.등록일시).getTime();
  });

  // 필터 버튼 데이터 - 두 그룹으로 분리
  const assetManagementFilters = [
    { key: '오늘', label: '오늘', count: roomMoveDataList.filter(d => isToday(d.운영종료일)).length },
    { key: '내일', label: '내일', count: roomMoveDataList.filter(d => isTomorrow(d.운영종료일)).length },
    { key: '이번주', label: '이번주', count: roomMoveDataList.filter(d => isThisWeek(d.운영종료일)).length },
    { key: '이번달', label: '이번달', count: roomMoveDataList.filter(d => isThisMonth(d.운영종료일)).length },
    { key: '우선처리', label: '우선처리', count: roomMoveDataList.filter(d => d.우선처리).length },
  ];

  const officeManagementFilters = [
    { key: '1차', label: '1차', count: roomMoveDataList.filter(d => d.차수.includes('1')).length },
    { key: '2차', label: '2차', count: roomMoveDataList.filter(d => d.차수.includes('2')).length },
    { key: '3차', label: '3차', count: roomMoveDataList.filter(d => d.차수.includes('3')).length },
    { key: '4차', label: '4차', count: roomMoveDataList.filter(d => d.차수.includes('4')).length },
  ];

  const completionFilters = [
    { key: '전체', label: '전체', count: filteredData.length },
    { key: '완료', label: '완료', count: filteredData.filter(d => d.관리사무소확인).length },
    { key: '미완료', label: '미완료', count: filteredData.filter(d => !d.관리사무소확인).length },
  ];

  // 🔥 핵심 업데이트 함수: 차수+호실 기준으로 업데이트
  const handleDataUpdate = (data: RoomMoveData, updates: Partial<Complaint>) => {
    console.log('🔄 handleDataUpdate 호출:', { 
      id: data.id,
      차수: data.차수, 
      호실: data.호실, 
      hasComplaint: data.hasComplaint,
      updates 
    });
    
    // hasComplaint가 true이고 ID가 mock이 아닌 경우, 직접 ID로 업데이트
    if (data.hasComplaint && !data.id.startsWith('mock-')) {
      console.log('✅ 실제 민원 ID로 직접 업데이트:', data.id);
      onUpdate(data.id, updates);
    } else {
      // 가상 데이터거나 민원이 없는 경우, 차수+호실로 업데이트
      console.log('📝 차수+호실 기준으로 업데이트');
      onRoomMoveDataUpdate(data.차수, data.호실, updates);
    }
  };

  // 계약서 파일 업로드 핸들러
  const handleContractUpload = (data: RoomMoveData, file: File) => {
    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB 제한
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      handleDataUpdate(data, { 
        계약서파일: base64,
        계약서파일명: file.name,
        퇴실상태: '계약서' // 계약서 업로드 시 자동으로 상태 변경
      });
      alert(`✅ 계약서 "${file.name}"가 업로드되었습니다.`);
    };
    reader.readAsDataURL(file);
  };

  // 계약서 파일 다운로드 핸들러
  const handleContractDownload = (data: RoomMoveData) => {
    if (!data.계약서파일 || !data.계약서파일명) return;
    
    const link = document.createElement('a');
    link.href = data.계약서파일;
    link.download = data.계약서파일명;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 계약서 파일 삭제 핸들러
  const handleContractDelete = (data: RoomMoveData) => {
    if (!confirm('계약서 파일을 삭제하시겠습니까?')) return;
    
    handleDataUpdate(data, { 
      계약서파일: undefined,
      계약서파일명: undefined
    });
    alert('✅ 계약서 파일이 삭제되었습니다.');
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (data: RoomMoveData, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleContractUpload(data, file);
    }
  };

  // 우선처리 토글
  const togglePriority = (data: RoomMoveData) => {
    console.log('⭐ 우선처리 토글:', data.차수, data.호실, '현재:', data.우선처리);
    handleDataUpdate(data, { 우선처리: !data.우선처리 });
  };

  // 프린트 핸들러
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>객실이동 리스트</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #1e40af; color: white; }
        </style>
      </head>
      <body>
        <h1>객실이동 리스트</h1>
        <p>출력일시: ${new Date().toLocaleString('ko-KR')}</p>
        <table>
          <thead>
            <tr>
              <th>번호</th>
              <th>우선</th>
              <th>차수</th>
              <th>호실</th>
              <th>상태</th>
              <th>운영종료일</th>
              <th>이사일</th>
              <th>민원내용</th>
              <th>조치사항</th>
            </tr>
          </thead>
          <tbody>
            ${sortedData.map((d, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${d.우선처리 ? '★' : ''}</td>
                <td>${d.차수}차</td>
                <td>${d.호실}호</td>
                <td>${d.상태}</td>
                <td>${d.운영종료일 ? new Date(d.운영종료일).toLocaleDateString('ko-KR') : '-'}</td>
                <td>${d.이사일 ? new Date(d.이사일).toLocaleDateString('ko-KR') : '-'}</td>
                <td>${d.내용}</td>
                <td>${d.객실이동조치 || '-'}</td>
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
      ['번호', '우���처리', '차수', '호실', '상태', '운영종료일', '이사일', '민원내용', '조치사항', '등록일시']
    ];

    sortedData.forEach((d, idx) => {
      worksheetData.push([
        (idx + 1).toString(),
        d.우선처리 ? '★' : '',
        d.차수 + '차',
        d.호실 + '호',
        d.상태,
        d.운영종료일 ? new Date(d.운영종료일).toLocaleDateString('ko-KR') : '-',
        d.이사일 ? new Date(d.이사일).toLocaleDateString('ko-KR') : '-',
        d.내용,
        d.객실이동조치 || '-',
        new Date(d.등록일시).toLocaleString('ko-KR')
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '객실이동');
    
    const fileName = `객실이동_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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

  // 상 색상
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '접수': 'bg-blue-100 text-blue-700 border-blue-300',
      '영선팀': 'bg-teal-100 text-teal-700 border-teal-300',
      '진행중': 'bg-orange-100 text-orange-700 border-orange-300',
      '부서이관': 'bg-purple-100 text-purple-700 border-purple-300',
      '외부업체': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      '완료': 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <div className="space-y-3">
      {/* 헤더 & 필터 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-base font-bold text-gray-900">🚪 객실이동 <span className="text-sm text-gray-500 ml-2">전체 {roomMoveDataList.length}건 | 표시 {sortedData.length}건</span></h2>
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

        {/* 필터 시스템 */}
        <div className="space-y-4">
          {/* 메인 필터 선택 */}
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-gray-700">필터 선택:</span>
            <button
              onClick={() => handleMainFilterModeChange('자산관리')}
              className={`px-4 py-1.5 rounded text-sm font-bold transition-all border ${
                mainFilterMode === '자산관리'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              자산관리
            </button>
            <button
              onClick={() => handleMainFilterModeChange('관리사무소')}
              className={`px-4 py-1.5 rounded text-sm font-bold transition-all border ${
                mainFilterMode === '관리사무소'
                  ? 'bg-green-600 text-white border-green-700 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
              }`}
            >
              관리사무소
            </button>
            {mainFilterMode && (
              <button
                onClick={() => {
                  setMainFilterMode(null);
                  setAssetFilters([]);
                  setOfficeFilter(null);
                }}
                className="px-3 py-1.5 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
              >
                초기화
              </button>
            )}
          </div>

          {/* 자산관리 하위 필터 */}
          {mainFilterMode === '자산관리' && (
            <div className="pl-5 border-l-4 border-blue-500 space-y-3">
              <div className="text-sm text-gray-600 mb-2">※ 복수 선택 가능 (OR 조건)</div>
              <div className="flex flex-wrap gap-3">
                {[...assetManagementFilters, { key: '완료', label: '완료', count: roomMoveDataList.filter(d => d.관리사무소확인).length }, { key: '미완료', label: '미완료', count: roomMoveDataList.filter(d => !d.관리사무소확인).length }].map(filter => {
                  const isSelected = assetFilters.includes(filter.key);
                  return (
                    <button
                      key={filter.key}
                      onClick={() => toggleAssetFilter(filter.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        isSelected
                          ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                          : 'bg-white text-gray-700 border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      {filter.label} <span className="font-bold">({filter.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 관리사무소 하위 필터 */}
          {mainFilterMode === '관리사무소' && (
            <div className="pl-4 border-l-4 border-green-500 space-y-2">
              <div className="text-xs text-gray-600 mb-1">※ 단독 선택만 가능 (퇴실상태 "완료"만 표시)</div>
              <div className="flex flex-wrap gap-2">
                {['1차', '2차', '3차', '4차'].map(차수 => (
                  <div key={차수} className="flex gap-1">
                    {['완료', '미완료'].map(상태 => {
                      const filterKey = `${차수} ${상태}`;
                      const count = roomMoveDataList.filter(d => {
                        // 퇴실상태가 "완료"인 것만 카운트
                        if (d.퇴실상태 !== '완료') return false;
                        const 차수매치 = d.차수.includes(차수.replace('차', ''));
                        const 상태매치 = 상태 === '완료' ? d.관리사무소확인 === true : !d.관리사무소확인;
                        return 차수매치 && 상태매치;
                      }).length;
                      const isSelected = officeFilter === filterKey;
                      return (
                        <button
                          key={filterKey}
                          onClick={() => setOfficeFilter(isSelected ? null : filterKey)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                            isSelected
                              ? 'bg-green-500 text-white border-green-600 shadow-md'
                              : 'bg-white text-gray-700 border-green-200 hover:bg-green-50'
                          }`}
                        >
                          {filterKey} <span className="font-bold">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 객실이동 리스트 - 2열 그리드 */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sortedData.map((data) => (
            <div
              key={data.id}
              className={`bg-white rounded-lg shadow-md border-2 transition-all ${
                data.우선처리 ? 'border-yellow-400 bg-yellow-50' : 
                data.상태 === '완료' ? 'border-gray-200 opacity-50' : 'border-gray-200'
              }`}
            >
              <div 
                className="p-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === data.id ? null : data.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    {/* 우선처리 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePriority(data);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                        data.우선처리
                          ? 'bg-yellow-400 text-white shadow-lg'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${data.우선처리 ? 'fill-current' : ''}`} />
                      {data.우선처리 && <span>우선</span>}
                    </button>

                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(data.상태)}`}>
                      {data.상태}
                    </span>
                    <span className="text-sm font-bold text-gray-700">
                      {data.차수}차 {data.호실}호
                    </span>
                    <span className="text-xs text-amber-600 font-medium">
                      퇴실: {formatShortDate(data.운영종료일)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* 퇴실상태 버튼 그룹 - 상단에 작게 배치 */}
                    {(['준비', '연락', '퇴실', '계약서', '완료'] as const).map((status, index) => {
                      const currentIndex = ['준비', '연락', '퇴실', '계약서', '완료'].indexOf(data.퇴실상태 || '준비');
                      const isPast = index < currentIndex;  // 현재 상태는 포함하지 않음
                      const isActive = data.퇴실상태 === status;
                      
                      // 표시 레이블 변경: "계약서" → "작성"
                      const displayLabel = status === '계약서' ? '작성' : status;
                      
                      return (
                        <div key={`${data.id}-${status}`} className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('퇴실상태 버튼 클릭:', status, '차수:', data.차수, '호실:', data.호실);
                              handleDataUpdate(data, { 퇴실상태: status });
                            }}
                            className={`px-2 py-1 rounded-lg transition-colors text-xs font-medium shadow-sm flex-shrink-0 ${
                              isActive
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-300 text-white hover:bg-gray-400'
                            } ${isPast ? 'opacity-40' : ''}`}
                          >
                            {isActive ? displayLabel : `${displayLabel}전`}
                          </button>
                          {index < 4 && (
                            <span className={`text-gray-400 text-sm ${isPast ? 'opacity-40' : ''}`}>▶</span>
                          )}
                        </div>
                      );
                    })}
                    {expandedId === data.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
                    )}
                  </div>
                </div>
                
                <p className="text-xs text-gray-900 line-clamp-1">{data.내용}</p>
              </div>

              {/* 확장 영역 */}
              {expandedId === data.id && (
                <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-3">
                  {/* 실 정보 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <label className="text-xs font-medium text-gray-700 block mb-2">📋 호실 정보</label>
                    {(() => {
                      const roomData = rooms.find(r => r.차수 === data.차수 && r.호수 === data.호실);
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

                  {/* 날짜 정보 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">운영종료일 (읽기전용)</label>
                      <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
                        {formatShortDate(data.운영종료일)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        이사일
                      </label>
                      <Popover 
                        open={moveDatePopovers[data.id]} 
                        onOpenChange={(open) => setMoveDatePopovers({...moveDatePopovers, [data.id]: open})}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-left flex items-center gap-2 bg-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className={data.이사일 ? 'text-gray-900' : 'text-gray-500'}>
                              {formatShortDate(data.이사일)}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md bg-white" align="start">
                          <Calendar
                            mode="single"
                            selected={data.이사일 ? new Date(data.이사일) : undefined}
                            onSelect={(date) => {
                              console.log('이사일 선택:', date, '차수:', data.차수, '호실:', data.호실);
                              handleDataUpdate(data, { 이사일: date?.toISOString() });
                              setMoveDatePopovers({...moveDatePopovers, [data.id]: false});
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* 객실이동 조치 */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">객실이동 조치</label>
                    <textarea
                      value={localActionText[data.id] !== undefined ? localActionText[data.id] : data.객실이동조치 || ''}
                      onChange={(e) => {
                        setLocalActionText(prev => ({ ...prev, [data.id]: e.target.value }));
                      }}
                      onBlur={(e) => {
                        console.log('객실이동 조치 저장 (blur):', e.target.value, '차수:', data.차수, '호실:', data.호실);
                        handleDataUpdate(data, { 객실이동조치: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-none"
                      rows={3}
                      placeholder="객실이동 조치사항을 입력하세요"
                    />
                  </div>

                  {/* 계약서 파일 업로드 */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">계약서 파일 업로드</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleContractUpload(data, file);
                        }}
                        className="hidden"
                        id={`contract-upload-${data.id}`}
                      />
                      <label
                        htmlFor={`contract-upload-${data.id}`}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                      >
                        파일 선택
                      </label>
                      {data.계약서파일명 && (
                        <button
                          onClick={() => handleContractDownload(data)}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-green-200 text-green-700 hover:bg-green-300 cursor-pointer"
                        >
                          다운로드
                        </button>
                      )}
                      {data.계약서파일명 && (
                        <button
                          onClick={() => handleContractDelete(data)}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-red-200 text-red-700 hover:bg-red-300 cursor-pointer"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 사진 */}
                  {data.사진 && data.사진.length > 0 && (
                    <div className="flex gap-2">
                      {data.사진.map((img, idx) => (
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
                    <div>등록: {formatDate(data.등록일시)}</div>
                    {data.완료일시 && (
                      <div className="text-green-600">완료: {formatDate(data.완료일시)}</div>
                    )}
                    {!data.hasComplaint && (
                      <div className="text-amber-600">※ 민원 미등록 (객실정보만 존재)</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {sortedData.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500">해당 조건의 객실이동이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 객실이동 리스트 - 테이블 (2열) */}
      {viewMode === 'table' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 왼쪽 테이블 */}
          <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="w-full border-collapse" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-9">번호</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-9">우선</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-11">차수</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-12">호실</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-14">퇴실상태</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-12">계약서</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-18">운영종료일</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-18">이사일</th>
                  <th className="px-1 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap min-w-0">조치사항</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-9">확인</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.filter((_, i) => i % 2 === 0).map((data, idx) => {
                  const actualIndex = idx * 2;
                  return (
                    <tr key={data.id} className={`border-b border-gray-200 transition-all ${data.우선처리 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'} ${data.관리사무소확인 ? 'opacity-40' : ''}`}>
                      <td className="px-0.5 py-1 text-xs text-gray-900 whitespace-nowrap text-center">{actualIndex + 1}</td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <button onClick={(e) => { e.stopPropagation(); togglePriority(data); }} className={`flex items-center justify-center w-7 h-7 rounded-full transition-all border-2 ${data.우선처리 ? 'bg-yellow-400 border-yellow-500 text-white shadow-md' : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'}`}>
                            <Star className={`w-4 h-4 ${data.우선처리 ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </td>
                      <td className="px-0.5 py-1 text-xs text-gray-900 whitespace-nowrap font-medium text-center">{data.차수}차</td>
                      <td className="px-0.5 py-1 text-xs text-gray-900 whitespace-nowrap font-medium text-center">{data.호실}호</td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <select
                            value={data.퇴실상태 || '준비'}
                            onChange={(e) => {
                              const value = e.target.value as '준비' | '연락' | '퇴실' | '계약서' | '완료';
                              handleDataUpdate(data, { 퇴실상태: value });
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="준비">준비</option>
                            <option value="연락">연락</option>
                            <option value="퇴실">퇴실</option>
                            <option value="계약서">계약서</option>
                            <option value="완료">완료</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          {data.계약서파일 ? (
                            <button onClick={(e) => { e.stopPropagation(); handleContractDownload(data); }} className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-green-100 hover:bg-green-200 transition-colors" title={data.계약서파일명}>
                              <FileText className="w-3 h-3 text-green-700" />
                              <span className="text-[9px] text-green-700 font-medium">다운로드</span>
                            </button>
                          ) : (
                            <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(data, e)} className="relative border-2 border-dashed border-gray-300 rounded px-1 py-0.5 hover:border-blue-400 transition-colors cursor-pointer w-fit max-w-[52px]">
                              <input type="file" accept="application/pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleContractUpload(data, file); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <div className="flex items-center gap-0.5 pointer-events-none whitespace-nowrap">
                                <Upload className="w-2 h-2 text-gray-400 flex-shrink-0" />
                                <span className="text-[9px] text-gray-500">PDF</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <Popover open={endDatePopovers[data.id]} onOpenChange={(open) => setEndDatePopovers({...endDatePopovers, [data.id]: open})}>
                            <PopoverTrigger asChild>
                              <button type="button" className="px-2 py-0.5 text-xs border border-gray-300 rounded flex items-center gap-1 bg-white hover:bg-gray-50 justify-center">
                                <CalendarIcon className="w-3 h-3 text-gray-400" />
                                <span className={data.운영종료일 ? 'text-gray-900 text-xs' : 'text-gray-500 text-xs'}>{formatShortDate(data.운영종료일)}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md bg-white" align="start">
                              <Calendar mode="single" selected={data.운영종료일 ? new Date(data.운영종료일) : undefined} onSelect={(date) => { handleDataUpdate(data, { 운영종료일: date?.toISOString() }); setEndDatePopovers({...endDatePopovers, [data.id]: false}); }} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <Popover open={moveDatePopovers[data.id]} onOpenChange={(open) => setMoveDatePopovers({...moveDatePopovers, [data.id]: open})}>
                            <PopoverTrigger asChild>
                              <button type="button" className="px-2 py-0.5 text-xs border border-gray-300 rounded flex items-center gap-1 bg-white hover:bg-gray-50 justify-center">
                                <CalendarIcon className="w-3 h-3 text-gray-400" />
                                <span className={data.이사일 ? 'text-gray-900 text-xs' : 'text-gray-500 text-xs'}>{formatShortDate(data.이사일)}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md bg-white" align="start">
                              <Calendar mode="single" selected={data.이사일 ? new Date(data.이사일) : undefined} onSelect={(date) => { handleDataUpdate(data, { 이사일: date?.toISOString() }); setMoveDatePopovers({...moveDatePopovers, [data.id]: false}); }} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                      <td className="px-1 py-1 text-xs min-w-[380px] w-full">
                        <textarea
                          value={localActionText[data.id] !== undefined ? localActionText[data.id] : data.객실이동조치 || ''}
                          onChange={(e) => {
                            setLocalActionText(prev => ({ ...prev, [data.id]: e.target.value }));
                          }}
                          onBlur={(e) => {
                            handleDataUpdate(data, { 객실이동조치: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full min-w-[340px] px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 resize-none"
                          rows={1}
                          placeholder="조치사항"
                        />
                      </td>
                      <td className="px-0.5 py-1 text-xs text-center">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={data.관리사무소확인 || false}
                            onChange={(e) => {
                              handleDataUpdate(data, { 관리사무소확인: e.target.checked });
                            }}
                            style={{
                              backgroundImage: data.관리사무소확인 
                                ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E")` 
                                : 'none',
                              backgroundSize: '70%',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }}
                            className="w-5 h-5 appearance-none border-2 border-gray-400 rounded bg-white cursor-pointer transition-all hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedData.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">해당 조건의 객실이동이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 오른쪽 테이블 */}
          <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="w-full border-collapse" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-9">번호</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-9">우선</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-11">차수</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-12">호실</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-14">퇴실상태</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-12">계약서</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-18">운영종료일</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-18">이사일</th>
                  <th className="px-1 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap min-w-0">조치사항</th>
                  <th className="px-0.5 py-1 bg-blue-700 text-white text-center font-medium whitespace-nowrap w-9">확인</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.filter((_, i) => i % 2 === 1).map((data, idx) => {
                  const actualIndex = idx * 2 + 1;
                  return (
                    <tr key={data.id} className={`border-b border-gray-200 transition-all ${data.우선처리 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'} ${data.관리사무소확인 ? 'opacity-40' : ''}`}>
                      <td className="px-0.5 py-1 text-xs text-gray-900 whitespace-nowrap text-center">{actualIndex + 1}</td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePriority(data);
                            }}
                            className={`flex items-center justify-center w-7 h-7 rounded-full transition-all border-2 ${
                              data.우선처리
                                ? 'bg-yellow-400 border-yellow-500 text-white shadow-md'
                                : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${data.우선처리 ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </td>
                      <td className="px-0.5 py-1 text-xs text-gray-900 whitespace-nowrap font-medium text-center">{data.차수}차</td>
                      <td className="px-0.5 py-1 text-xs text-gray-900 whitespace-nowrap font-medium text-center">{data.호실}호</td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <select
                            value={data.퇴실상태 || '준비'}
                            onChange={(e) => {
                              const value = e.target.value as '준비' | '연락' | '퇴실' | '계약서' | '완료';
                              handleDataUpdate(data, { 퇴실상태: value });
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="준비">준비</option>
                            <option value="연락">연락</option>
                            <option value="퇴실">퇴실</option>
                            <option value="계약서">계약서</option>
                            <option value="완료">완료</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          {data.계약서파일 ? (
                            <button onClick={(e) => { e.stopPropagation(); handleContractDownload(data); }} className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-green-100 hover:bg-green-200 transition-colors" title={data.계약서파일명}>
                              <FileText className="w-3 h-3 text-green-700" />
                              <span className="text-[9px] text-green-700 font-medium">다운로드</span>
                            </button>
                          ) : (
                            <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(data, e)} className="relative border-2 border-dashed border-gray-300 rounded px-1 py-0.5 hover:border-blue-400 transition-colors cursor-pointer w-fit max-w-[52px]">
                              <input type="file" accept="application/pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleContractUpload(data, file); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <div className="flex items-center gap-0.5 pointer-events-none whitespace-nowrap">
                                <Upload className="w-2 h-2 text-gray-400 flex-shrink-0" />
                                <span className="text-[9px] text-gray-500">PDF</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <Popover open={endDatePopovers[data.id]} onOpenChange={(open) => setEndDatePopovers({...endDatePopovers, [data.id]: open})}>
                            <PopoverTrigger asChild>
                              <button type="button" className="px-2 py-0.5 text-xs border border-gray-300 rounded flex items-center gap-1 bg-white hover:bg-gray-50 justify-center">
                                <CalendarIcon className="w-3 h-3 text-gray-400" />
                                <span className={data.운영종료일 ? 'text-gray-900 text-xs' : 'text-gray-500 text-xs'}>{formatShortDate(data.운영종료일)}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md bg-white" align="start">
                              <Calendar mode="single" selected={data.운영종료일 ? new Date(data.운영종료일) : undefined} onSelect={(date) => { handleDataUpdate(data, { 운영종료일: date?.toISOString() }); setEndDatePopovers({...endDatePopovers, [data.id]: false}); }} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                      <td className="px-0.5 py-1 text-xs whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <Popover open={moveDatePopovers[data.id]} onOpenChange={(open) => setMoveDatePopovers({...moveDatePopovers, [data.id]: open})}>
                            <PopoverTrigger asChild>
                              <button type="button" className="px-2 py-0.5 text-xs border border-gray-300 rounded flex items-center gap-1 bg-white hover:bg-gray-50 justify-center">
                                <CalendarIcon className="w-3 h-3 text-gray-400" />
                                <span className={data.이사일 ? 'text-gray-900 text-xs' : 'text-gray-500 text-xs'}>{formatShortDate(data.이사일)}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md bg-white" align="start">
                              <Calendar mode="single" selected={data.이사일 ? new Date(data.이사일) : undefined} onSelect={(date) => { handleDataUpdate(data, { 이사일: date?.toISOString() }); setMoveDatePopovers({...moveDatePopovers, [data.id]: false}); }} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                      <td className="px-1 py-1 text-xs min-w-[380px] w-full">
                        <textarea
                          value={localActionText[data.id] !== undefined ? localActionText[data.id] : data.객실이동조치 || ''}
                          onChange={(e) => {
                            setLocalActionText(prev => ({ ...prev, [data.id]: e.target.value }));
                          }}
                          onBlur={(e) => {
                            handleDataUpdate(data, { 객실이동조치: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full min-w-[340px] px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 resize-none"
                          rows={1}
                          placeholder="조치사항"
                        />
                      </td>
                      <td className="px-0.5 py-1 text-xs text-center">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={data.관리사무소확인 || false}
                            onChange={(e) => {
                              handleDataUpdate(data, { 관리사무소확인: e.target.checked });
                            }}
                            style={{
                              backgroundImage: data.관리사무소확인 
                                ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2316a34a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E")` 
                                : 'none',
                              backgroundSize: '70%',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }}
                            className="w-5 h-5 appearance-none border-2 border-gray-400 rounded bg-white cursor-pointer transition-all hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedData.length <= 1 && (
              <div className="text-center py-12">
                <p className="text-gray-500">-</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}