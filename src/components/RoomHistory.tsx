import { useState, useRef } from 'react';
import { History, ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';
import type { Complaint } from '../App';
import { getRoomInfo } from '../data/roomData';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { DateCell } from './DateCell';
import { formatShortDate, formatTime, formatDateTime, dateToShortString } from '../utils/dateFormat';

// 숙박형태 옵션 목록
const ACCOMMODATION_TYPES = [
  '인스파이어', '장박_개인', '장박_법인', '호텔', '기숙사',
  '입실예정', '계약만료', '공실 보수중', '사용금지', '퇴실'
] as const;

interface RoomHistoryProps {
  selectedRoom: { 차수: string; 호실: string };
  onRoomChange: (room: { 차수: string; 호실: string }) => void;
  complaints: Complaint[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  onImageClick: (imageUrl: string) => void;
  viewMode?: 'card' | 'table';
  onViewModeChange?: (mode: 'card' | 'table') => void;
  onRoomAccommodationTypeUpdate?: (차수: string, 호실: string, 숙박형태: string) => void;
  compactMode?: boolean;
  showOnlyList?: boolean;
  inlineMode?: boolean;
  noBorder?: boolean;
  onNavigateToHistory?: () => void;
}

const getUserName = (userId: string | undefined): string => {
  if (userId == null) return '-';
  const userMap: Record<string, string> = {
    '01': '수용', '02': '동훈', '03': '시우', '04': '현석', '05': '아름', '06': '남식', '07': '영선', '08': '관리사무소', '09': '키핑'
  };
  return userMap[userId] || userId;
};

export function RoomHistory({ selectedRoom, onRoomChange, complaints, onUpdate, onImageClick, viewMode, onViewModeChange, onRoomAccommodationTypeUpdate, compactMode, showOnlyList, inlineMode, noBorder, onNavigateToHistory }: RoomHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // ?곗뒪?ы넲??Popover 상태
  const [desktopContactDatePopovers, setDesktopContactDatePopovers] = useState<Record<string, boolean>>({});
  const [desktopActionDatePopovers, setDesktopActionDatePopovers] = useState<Record<string, boolean>>({});
  // 紐⑤컮?쇱슜 Popover 상태
  const [mobileContactDatePopovers, setMobileContactDatePopovers] = useState<Record<string, boolean>>({});
  const [mobileActionDatePopovers, setMobileActionDatePopovers] = useState<Record<string, boolean>>({});
  // ?뚯씠釉?酉곗슜 Popover 상태
  const [datePopovers, setDatePopovers] = useState<Record<string, { 연락일: boolean; 조치일: boolean }>>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingCardAccommodationType, setEditingCardAccommodationType] = useState<string | null>(null);
  const 호실InputRef = useRef<HTMLInputElement>(null);

  const categories = ['영선', 'CS', '입실', '퇴실', '청소'];

  // 移댄뀒怨좊━ ?좉? ?⑥닔
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // ?꾪꽣留곷맂 誘쇱썝 紐⑸줉
  const filteredComplaints = selectedCategories.length > 0
    ? complaints.filter(c => selectedCategories.includes(c.구분))
    : complaints;

  // 理쒖떊(泥?踰덉㎏) 誘쇱썝 ID ?뺤씤 - 숙박형태 蹂寃????닿쾬留??낅뜲?댄듃
  const latestComplaintId = filteredComplaints.length > 0 ? filteredComplaints[0].id : null;

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

  const handleStatusChange = (id: string, newStatus: '접수' | '영선팀' | '진행중' | '부서이관' | '외부업체' | '완료') => {
    const updates: Partial<Complaint> = { 상태: newStatus };
    if (newStatus === '완료') {
      updates.완료일시 = new Date().toISOString();
    }
    onUpdate(id, updates);
  };

  const roomInfo = getRoomInfo(selectedRoom.차수, selectedRoom.호실);
  const showHistory = selectedRoom.호실.length >= 3;
  
  // ?섏씠吏?ㅼ씠??상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // showOnlyList 紐⑤뱶 (compactMode+inlineMode? ?④퍡 ?ъ슜 ???꾨옒 踰꾪듉 ?놁쓬): 寃?됰맂 誘쇱썝 紐⑸줉留??섏씠吏?ㅼ씠?섍낵 ?④퍡 ?쒖떆
  if (showOnlyList && !compactMode) {
    return (
      <div className={noBorder ? "w-full h-full" : "bg-white rounded-lg shadow-md p-4 w-full h-full"}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">
                검색결과 {showHistory ? `(${filteredComplaints.length}건)` : ''}
              </h2>
              {onNavigateToHistory && showHistory && (
                <button
                  type="button"
                  onClick={onNavigateToHistory}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  히스토리
                </button>
              )}
            </div>
            
            {/* 구분 ?꾪꽣 踰꾪듉 (compactMode ?놁쓣 ?뚮쭔 ?쒖떆) */}
            {showHistory && (
              <div className="flex gap-1 ml-4">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      selectedCategories.includes(category)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {showHistory && filteredComplaints.length > 0 && (
            <div className="flex gap-1.5">
              <button
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'card' 
                    ? 'bg-green-600 text-white shadow-sm' 
                    : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
                }`}
                onClick={() => onViewModeChange?.('card')}
              >
                카드형              </button>
              <button
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                }`}
                onClick={() => onViewModeChange?.('table')}
              >
                테이블
              </button>
            </div>
          )}
        </div>
        
        {!showHistory ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">호실을 입력하면 민원 검색이 됩니다</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">해당 호실 민원 검색이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 카드형蹂닿린 - 4?? ?대┃ ???뺤옣 媛??*/}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {paginatedComplaints.map((complaint, index) => {
                  const complaintRoomInfo = getRoomInfo(complaint.차수, complaint.호실);
                  const isExpanded = expandedId === complaint.id;
                  return (
                    <div
                      key={complaint.id}
                      className={`bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer ${isExpanded ? 'ring-2 ring-blue-400' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                    >
                      <div className="p-3">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[10px] font-medium text-gray-400">
                            {(currentPage - 1) * itemsPerPage + index + 1}.
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(complaint.상태)}`}>
                            {complaint.상태}
                          </span>
                          <span className="text-xs font-bold text-gray-700">
                            {complaint.차수}차 {complaint.호실}호                          </span>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            {complaint.구분}
                          </span>
                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                            {getUserName(complaint.등록자)}
                          </span>
                          <span className="text-[10px] text-gray-500">{formatShortDate(complaint.등록일시)}</span>
                        </div>
                        <p className="text-xs text-gray-900 line-clamp-2">{complaint.내용}</p>
                        {complaint.조치사항 && !isExpanded && (
                          <p className="text-xs text-green-700 mt-1 line-clamp-1">조치: {complaint.조치사항}</p>
                        )}
                      </div>
                      
                      {/* ?뺤옣 ?곸뿭 - ?섏젙 媛??*/}
                      {isExpanded && (
                        <div className="border-t border-gray-200 p-3 bg-white space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">민원내용</label>
                            <textarea
                              key={`edit-content-${complaint.id}`}
                              defaultValue={complaint.내용}
                              onBlur={(e) => { if (e.target.value !== complaint.내용) onUpdate(complaint.id, { 내용: e.target.value }); }}
                              rows={2}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">조치사항</label>
                            <textarea
                              key={`edit-action-${complaint.id}`}
                              defaultValue={complaint.조치사항 || ''}
                              onBlur={(e) => { if (e.target.value !== (complaint.조치사항 || '')) onUpdate(complaint.id, { 조치사항: e.target.value }); }}
                              placeholder="조치사항 입력"
                              rows={2}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">상태</label>
                            <select
                              value={complaint.상태}
                              onChange={(e) => handleStatusChange(complaint.id, e.target.value as any)}
                              className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(complaint.상태)}`}
                            >
                              <option value="접수">접수</option>
                              <option value="영선팀">영선팀</option>
                              <option value="진행중">진행중</option>
                              <option value="부서이관">부서이관</option>
                              <option value="외부업체">외부업체</option>
                              <option value="완료">완료</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* 테이블 蹂닿린 */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1.5 text-left font-medium">No</th>
                      <th className="px-2 py-1.5 text-left font-medium">상태</th>
                      <th className="px-2 py-1.5 text-left font-medium">구분</th>
                      <th className="px-2 py-1.5 text-left font-medium">호실</th>
                      <th className="px-2 py-1.5 text-left font-medium">내용</th>
                      <th className="px-2 py-1.5 text-left font-medium">등록자</th>
                      <th className="px-2 py-1.5 text-left font-medium">등록일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedComplaints.map((complaint, index) => (
                      <tr key={complaint.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-1.5">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="px-2 py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(complaint.상태)}`}>
                            {complaint.상태}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">{complaint.구분}</td>
                        <td className="px-2 py-1.5">{complaint.차수}차 {complaint.호실}호</td>
                        <td className="px-2 py-1.5 max-w-[200px] truncate">{complaint.내용}</td>
                        <td className="px-2 py-1.5">{getUserName(complaint.등록자)}</td>
                        <td className="px-2 py-1.5">{formatShortDate(complaint.등록일시)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* ?섏씠吏?ㅼ씠??*/}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-100"
                >
                  이전
                </button>
                <span className="text-xs text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-100"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // compactMode + inlineMode: ??以꾨줈 湲멸쾶 ?쒖떆 (showOnlyList? ?④퍡 ?ъ슜 ???꾨옒??寃?됯껐怨쇰룄 ?쒖떆)
  if (compactMode && inlineMode) {
    const filterButtons = (
      <div className="flex gap-1.5 ml-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => toggleCategory(category)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              selectedCategories.includes(category)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    );

    return (
      <div className={`${noBorder ? "w-full" : "bg-white rounded-lg shadow-md p-4"} w-full h-full flex flex-col`}>
        {/* ?곷떒: 寃????(??踰꾪듉 5媛?- ?ш린?쒕쭔 ?ъ슜) */}
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5 whitespace-nowrap">
            <History className="w-5 h-5" />
            호실별 민원 검색 조회
          </h2>
          
          <div className="flex items-center gap-1">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">차수</label>
            <input
              type="text"
              value={selectedRoom.차수}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onRoomChange({ ...selectedRoom, 차수: value });
                if (value.length === 1) setTimeout(() => 호실InputRef.current?.focus(), 0);
              }}
              onFocus={() => onRoomChange({ ...selectedRoom, 차수: '' })}
              className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">호실</label>
            <input
              ref={호실InputRef}
              type="text"
              value={selectedRoom.호실}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onRoomChange({ ...selectedRoom, 호실: value });
              }}
              onFocus={() => onRoomChange({ ...selectedRoom, 호실: '' })}
              className="w-14 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {showHistory && roomInfo && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
              <span className="text-xs text-gray-500">숙박형태:</span>
              <span className={`text-xs font-semibold ${roomInfo.숙박형태 ? 'text-green-700' : 'text-gray-400'}`}>
                {roomInfo.숙박형태 || '-'}
              </span>
              <span className="text-blue-300 mx-1">|</span>
              <span className="text-xs text-gray-500">입주민</span>
              <span className="text-xs font-semibold text-gray-900">{roomInfo.입주민|| '-'}</span>
              <span className="text-blue-300 mx-1">|</span>
              <span className="text-xs text-gray-500">전화번호</span>
              <a href={`tel:${roomInfo.전화번호}`} className="text-xs font-semibold text-blue-600 hover:underline">
                {roomInfo.전화번호 || '-'}
              </a>
            </div>
          )}
          
          {showHistory && (
            <span className="text-sm text-gray-600">
              총 <span className="font-bold text-blue-600">{filteredComplaints.length}</span>건            </span>
          )}
          
          {showHistory && filterButtons}
        </div>

        {/* showOnlyList: ?꾨옒 寃?됯껐怨?(踰꾪듉 ?놁쓬 - ??踰꾪듉???꾪꽣 ?숈옉) */}
        {showOnlyList && (
          <>
            <div className="border-t border-gray-200 my-5"></div>
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">
                    검색결과 {showHistory ? `(${filteredComplaints.length}건)` : ''}
                  </h2>
                  {onNavigateToHistory && showHistory && (
                    <button
                      type="button"
                      onClick={onNavigateToHistory}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      히스토리
                    </button>
                  )}
                </div>
                {showHistory && filteredComplaints.length > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        viewMode === 'card' ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-green-600 border border-green-300 hover:bg-green-50'
                      }`}
                      onClick={() => onViewModeChange?.('card')}
                    >
                      카드형                    </button>
                    <button
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        viewMode === 'table' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50'
                      }`}
                      onClick={() => onViewModeChange?.('table')}
                    >
                      테이블
                    </button>
                  </div>
                )}
              </div>
              
              {!showHistory ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">호실을 입력하면 민원 검색이 됩니다</p>
                </div>
              ) : filteredComplaints.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-sm">해당 호실 민원 검색이 없습니다.</p>
                </div>
              ) : (
                <>
                  {viewMode === 'card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {paginatedComplaints.map((complaint, index) => {
                        const complaintRoomInfo = getRoomInfo(complaint.차수, complaint.호실);
                        const isExpanded = expandedId === complaint.id;
                        return (
                          <div
                            key={complaint.id}
                            className={`bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer ${isExpanded ? 'ring-2 ring-blue-400' : ''}`}
                            onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                          >
                            <div className="p-3">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-[10px] font-medium text-gray-400">
                                  {(currentPage - 1) * itemsPerPage + index + 1}.
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(complaint.상태)}`}>
                                  {complaint.상태}
                                </span>
                                <span className="text-xs font-bold text-gray-700">
                                  {complaint.차수}차 {complaint.호실}호                                </span>
                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                  {complaint.구분}
                                </span>
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                                  {getUserName(complaint.등록자)}
                                </span>
                                <span className="text-[10px] text-gray-500">{formatShortDate(complaint.등록일시)}</span>
                              </div>
                              <p className="text-xs text-gray-900 line-clamp-2">{complaint.내용}</p>
                              {complaint.조치사항 && !isExpanded && (
                                <p className="text-xs text-green-700 mt-1 line-clamp-1">조치: {complaint.조치사항}</p>
                              )}
                            </div>
                            {isExpanded && (
                              <div className="border-t border-gray-200 p-3 bg-white space-y-2" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">접수 내용</label>
                                  <textarea
                                    key={`edit-content-${complaint.id}`}
                                    defaultValue={complaint.내용}
                                    onBlur={(e) => { if (e.target.value !== complaint.내용) onUpdate(complaint.id, { 내용: e.target.value }); }}
                                    rows={2}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">조치사항</label>
                                  <textarea
                                    key={`edit-action-${complaint.id}`}
                                    defaultValue={complaint.조치사항 || ''}
                                    onBlur={(e) => { if (e.target.value !== (complaint.조치사항 || '')) onUpdate(complaint.id, { 조치사항: e.target.value }); }}
                                    placeholder="조치사항 입력"
                                    rows={2}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">상태</label>
                                  <select
                                    value={complaint.상태}
                                    onChange={(e) => handleStatusChange(complaint.id, e.target.value as any)}
                                    className={`w-full px-2 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(complaint.상태)}`}
                                  >
                                    <option value="접수">접수</option>
                                    <option value="영선팀">영선팀</option>
                                    <option value="진행중">진행중</option>
                                    <option value="부서이관">부서이관</option>
                                    <option value="외부업체">외부업체</option>
                                    <option value="완료">완료</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {viewMode === 'table' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-2 py-1.5 text-left font-medium">No</th>
                            <th className="px-2 py-1.5 text-left font-medium">상태</th>
                            <th className="px-2 py-1.5 text-left font-medium">구분</th>
                            <th className="px-2 py-1.5 text-left font-medium">호실</th>
<th className="px-2 py-1.5 text-left font-medium">내용</th>
                              <th className="px-2 py-1.5 text-left font-medium">등록자</th>
                              <th className="px-2 py-1.5 text-left font-medium">등록일시</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedComplaints.map((complaint, index) => (
                            <tr key={complaint.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-2 py-1.5">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                              <td className="px-2 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(complaint.상태)}`}>
                                  {complaint.상태}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">{complaint.구분}</td>
                              <td className="px-2 py-1.5">{complaint.차수}차 {complaint.호실}호</td>
                              <td className="px-2 py-1.5 max-w-[200px] truncate">{complaint.내용}</td>
                              <td className="px-2 py-1.5">{getUserName(complaint.등록자)}</td>
                              <td className="px-2 py-1.5">{formatShortDate(complaint.등록일시)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-100"
                      >
                        이전
                      </button>
                      <span className="text-xs text-gray-600">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-100"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // compactMode: 寃???쇰쭔 ?쒖떆 (결과 紐⑸줉 ?놁쓬)
  if (compactMode) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 w-full">
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
            <History className="w-4 h-4" />
            호실별 민원 검색 조회
          </h2>
          
          {/* 移댄뀒怨좊━ ?꾪꽣 踰꾪듉 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  selectedCategories.includes(category)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div>
          {/* 차수? 호실 ?낅젰 */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-shrink-0 w-[70px]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                차수
              </label>
              <input
                type="text"
                value={selectedRoom.차수}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  onRoomChange({ ...selectedRoom, 차수: value });
                  if (value.length === 1) setTimeout(() => 호실InputRef.current?.focus(), 0);
                }}
                onFocus={() => {
                  onRoomChange({ ...selectedRoom, 차수: '' });
                }}
                placeholder=""
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-shrink-0 w-[85px]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                호실
              </label>
              <input
                ref={호실InputRef}
                type="text"
                value={selectedRoom.호실}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  onRoomChange({ ...selectedRoom, 호실: value });
                }}
                onFocus={() => {
                  onRoomChange({ ...selectedRoom, 호실: '' });
                }}
                placeholder=""
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 숙박형태 ?쒕∼?ㅼ슫 */}
            {showHistory && (
              <div className="flex-shrink-0 w-[110px]">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  숙박형태
                </label>
                <select
                  value={roomInfo?.숙박형태 || ''}
                  onChange={(e) => {
                    if (onRoomAccommodationTypeUpdate && selectedRoom.차수 && selectedRoom.호실) {
                      onRoomAccommodationTypeUpdate(selectedRoom.차수, selectedRoom.호실, e.target.value);
                    }
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                    roomInfo?.숙박형태 ? 'border-green-400 bg-green-50 text-green-800 font-medium' : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <option value="">선택</option>
                  {ACCOMMODATION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 입주민?뺣낫 */}
          {roomInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mt-4">
              <div className="flex items-center text-sm gap-0">
                <span className="text-gray-500 whitespace-nowrap shrink-0">입주민:&nbsp;</span>
                <span className="font-semibold text-gray-900 whitespace-nowrap shrink-0">{roomInfo.입주민|| '-'}</span>
                <span className="mx-4 text-blue-300 shrink-0">|</span>
                <span className="text-gray-500 whitespace-nowrap shrink-0">전화번호:&nbsp;</span>
                <a 
                  href={`tel:${roomInfo.전화번호}`} 
                  className="font-semibold text-blue-600 hover:underline whitespace-nowrap truncate"
                >
                  {roomInfo.전화번호 || '-'}
                </a>
              </div>
            </div>
          )}
          
          {/* 검색결과 ?붿빟 */}
          {showHistory && (
            <div className="mt-3 text-sm text-gray-600">
              총<span className="font-bold text-blue-600">{filteredComplaints.length}</span>건의 민원 검색
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full">
      <div className="mb-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
          <History className="w-4 h-4" />
          호실별 민원 검색 조회
        </h2>
        
        {/* 移댄뀒怨좊━ ?꾪꽣 踰꾪듉 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                selectedCategories.includes(category)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        {/* 차수? 호실 ?낅젰 */}
        <div className="flex items-end gap-3 mb-3 flex-wrap">
          <div className="flex-shrink-0 w-[70px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              차수
            </label>
            <input
              type="text"
              value={selectedRoom.차수}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onRoomChange({ ...selectedRoom, 차수: value });
                if (value.length === 1) setTimeout(() => 호실InputRef.current?.focus(), 0);
              }}
              onFocus={(e) => {
                onRoomChange({ ...selectedRoom, 차수: '' });
              }}
              placeholder=""
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-shrink-0 w-[85px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              호실
            </label>
            <input
              ref={호실InputRef}
              type="text"
              value={selectedRoom.호실}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onRoomChange({ ...selectedRoom, 호실: value });
              }}
              onFocus={(e) => {
                onRoomChange({ ...selectedRoom, 호실: '' });
              }}
              placeholder=""
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 숙박형태 ?쒕∼?ㅼ슫 */}
          {showHistory && (
            <div className="flex-shrink-0 w-[110px]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                숙박형태
              </label>
              <select
                value={roomInfo?.숙박형태 || ''}
                onChange={(e) => {
                  if (onRoomAccommodationTypeUpdate && selectedRoom.차수 && selectedRoom.호실) {
                    onRoomAccommodationTypeUpdate(selectedRoom.차수, selectedRoom.호실, e.target.value);
                  }
                }}
                className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                  roomInfo?.숙박형태 ? 'border-green-400 bg-green-50 text-green-800 font-medium' : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                <option value="">선택</option>
                {ACCOMMODATION_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* 입주민?뺣낫 */}
          {roomInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 flex-1 min-w-[220px]">
              <div className="flex items-center text-sm gap-0">
                <span className="text-gray-500 whitespace-nowrap shrink-0">입주민:&nbsp;</span>
                <span className="font-semibold text-gray-900 whitespace-nowrap shrink-0">{roomInfo.입주민|| '-'}</span>
                <span className="mx-3 text-blue-300 shrink-0">|</span>
                <span className="text-gray-500 whitespace-nowrap shrink-0">전화번호:&nbsp;</span>
                <a 
                  href={`tel:${roomInfo.전화번호}`} 
                  className="font-semibold text-blue-600 hover:underline whitespace-nowrap truncate"
                >
                  {roomInfo.전화번호 || '-'}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        {!showHistory ? (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">호실 입력 후 검색해 주세요</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">해당 호실 민원 검색이 없습니다.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">
                총{filteredComplaints.length}건의 민원 검색
              </span>
              <div className="flex gap-1.5">
                <button
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    viewMode === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => onViewModeChange?.('card')}
                >
                  카드형                </button>
                <button
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => onViewModeChange?.('table')}
                >
                  테이블
                </button>
              </div>
            </div>
            
            {/* ?곗뒪?ы넲: 2??洹몃━??*/}
            {viewMode === 'card' && (
              <div className="hidden lg:grid lg:grid-cols-2 gap-3">
                {filteredComplaints.map((complaint, index) => {
                  const complaintRoomInfo = getRoomInfo(complaint.차수, complaint.호실);
                  // ?쒖떆??숙박형태: 理쒖떊(1踰? 誘쇱썝留??꾩옱 猷??뺣낫, ?섎㉧吏??誘쇱썝 ?먯껜????λ맂 媛믩쭔 ?쒖떆
                  const displayAccomType = complaint.id === latestComplaintId
                    ? (complaintRoomInfo?.숙박형태 || complaint.숙박형태)
                    : complaint.숙박형태;
                  const isLatest = complaint.id === latestComplaintId;
                  return (
                    <div
                      key={complaint.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div 
                        className="p-3 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap flex-1">
                            <span className="text-[10px] font-medium text-gray-400 min-w-[16px] text-right">
                              {index + 1}.
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(complaint.상태)}`}>
                              {complaint.상태}
                            </span>
                            <span className="text-xs font-bold text-gray-700">
                              {complaint.차수}차 {complaint.호실}호                            </span>
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                              {complaint.구분}
                            </span>
                            {displayAccomType && (
                              isLatest && editingCardAccommodationType === complaint.id ? (
                                <select
                                  value={complaintRoomInfo?.숙박형태 || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (onRoomAccommodationTypeUpdate) {
                                      onRoomAccommodationTypeUpdate(complaint.차수, complaint.호실, e.target.value);
                                    }
                                    setEditingCardAccommodationType(null);
                                  }}
                                  onBlur={(e) => {
                                    e.stopPropagation();
                                    setEditingCardAccommodationType(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                  className="px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                  {ACCOMMODATION_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              ) : isLatest ? (
                                <span 
                                  className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded cursor-pointer hover:bg-green-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCardAccommodationType(complaint.id);
                                  }}
                                  title="?대┃?섏뿬 숙박형태 ?섏젙"
                                >
                                  {displayAccomType}
                                </span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                  {displayAccomType}
                                </span>
                              )
                            )}
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {getUserName(complaint.등록자)}
                            </span>
                            <span 
                              className="text-xs text-gray-500 cursor-help" 
                              title={formatTime(complaint.등록일시)}
                            >
                              {formatShortDate(complaint.등록일시)}
                            </span>
                            {complaint.사진 && (
                              <div className="flex gap-1">
                                {complaint.사진.map((img, idx) => (
                                  <img 
                                    key={idx}
                                    src={img} 
                                    alt={`사진 ${idx + 1}`} 
                                    className="w-6 h-6 object-cover rounded border border-gray-300 cursor-pointer hover:border-blue-500 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onImageClick(img);
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          {expandedId === complaint.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-900 line-clamp-1 max-w-full">{complaint.내용}</p>
                      </div>

                      {expandedId === complaint.id && (
                        <div className="px-3 pb-3 border-t border-gray-200 pt-3 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              민원내용
                            </label>
                            <textarea
                              key={`edit-content-${complaint.id}`}
                              defaultValue={complaint.내용}
                              onBlur={(e) => { if (e.target.value !== complaint.내용) onUpdate(complaint.id, { 내용: e.target.value }); }}
                              rows={2}
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              조치사항
                            </label>
                            <textarea
                              key={`edit-action-${complaint.id}`}
                              defaultValue={complaint.조치사항 || ''}
                              onBlur={(e) => { if (e.target.value !== (complaint.조치사항 || '')) onUpdate(complaint.id, { 조치사항: e.target.value }); }}
                              placeholder="조치사항 입력"
                              rows={2}
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                            
                            {/* ?곕씫?쇨낵 조치사항*/}
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  ?곕씫??                                </label>
                                <Popover 
                                  open={desktopContactDatePopovers[complaint.id]} 
                                  onOpenChange={(open) => setDesktopContactDatePopovers({...desktopContactDatePopovers, [complaint.id]: open})}
                                >
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                                      <span className={complaint.연락일? 'text-gray-900' : 'text-gray-500'}>
                                        {complaint.연락일 ? formatShortDate(complaint.연락일) : '미입력'}
                                      </span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={complaint.연락일? new Date(complaint.연락일) : undefined}
                                      onSelect={(date) => {
                                        onUpdate(complaint.id, { 연락일: date?.toISOString() });
                                        setDesktopContactDatePopovers({...desktopContactDatePopovers, [complaint.id]: false});
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  조치사항                                </label>
                                <Popover 
                                  open={desktopActionDatePopovers[complaint.id]} 
                                  onOpenChange={(open) => setDesktopActionDatePopovers({...desktopActionDatePopovers, [complaint.id]: open})}
                                >
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center gap-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                                      <span className={complaint.조치일? 'text-gray-900' : 'text-gray-500'}>
                                        {complaint.조치일 ? formatShortDate(complaint.조치일) : '미입력'}
                                      </span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={complaint.조치일? new Date(complaint.조치일) : undefined}
                                      onSelect={(date) => {
                                        onUpdate(complaint.id, { 조치일: date?.toISOString() });
                                        setDesktopActionDatePopovers({...desktopActionDatePopovers, [complaint.id]: false});
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              처리상태 변경                            </label>
                            <div className="flex gap-1 flex-wrap">
                              {(['접수', '영선팀', '진행중', '부서이관', '외부업체', '완료'] as const).map((status) => (
                                <button
                                  key={status}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(complaint.id, status);
                                  }}
                                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    complaint.상태 === status
                                      ? status === '접수' ? 'bg-blue-600 text-white'
                                      : status === '영선팀' ? 'bg-teal-600 text-white'
                                      : status === '진행중' ? 'bg-orange-600 text-white'
                                      : status === '부서이관' ? 'bg-purple-600 text-white'
                                      : status === '외부업체' ? 'bg-indigo-600 text-white'
                                      : 'bg-green-600 text-white'
                                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {complaint.완료일시 && (
                            <div className="text-xs text-green-600 pt-2 border-t">
                              완료: {formatDateTime(complaint.완료일시)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 紐⑤컮?? ?⑥씪  */}
            {viewMode === 'card' && (
              <div className="lg:hidden space-y-2 max-h-96 overflow-y-auto">{filteredComplaints.map((complaint, index) => {
                const complaintRoomInfo = getRoomInfo(complaint.차수, complaint.호실);
                // ?쒖떆??숙박형태: 理쒖떊(1踰? 誘쇱썝留??꾩옱 猷??뺣낫, ?섎㉧吏??誘쇱썝 ?먯껜????λ맂 媛믩쭔 ?쒖떆
                const displayAccomType = complaint.id === latestComplaintId
                  ? (complaintRoomInfo?.숙박형태 || complaint.숙박형태)
                  : complaint.숙박형태;
                const isLatest = complaint.id === latestComplaintId;
                return (
                  <div
                    key={complaint.id}
                    className="bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div 
                      className="p-3 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap flex-1">
                          <span className="text-[10px] font-medium text-gray-400 min-w-[16px] text-right">
                            {index + 1}.
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(complaint.상태)}`}>
                            {complaint.상태}
                          </span>
                          <span className="text-xs font-bold text-gray-700">
                            {complaint.차수}차 {complaint.호실}호                          </span>
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            {complaint.구분}
                          </span>
                          {displayAccomType && (
                            isLatest && editingCardAccommodationType === complaint.id ? (
                              <select
                                value={complaintRoomInfo?.숙박형태 || ''}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (onRoomAccommodationTypeUpdate) {
                                    onRoomAccommodationTypeUpdate(complaint.차수, complaint.호실, e.target.value);
                                  }
                                  setEditingCardAccommodationType(null);
                                }}
                                onBlur={(e) => {
                                  e.stopPropagation();
                                  setEditingCardAccommodationType(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                {ACCOMMODATION_TYPES.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            ) : isLatest ? (
                              <span 
                                className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded cursor-pointer hover:bg-green-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCardAccommodationType(complaint.id);
                                }}
                                title="?대┃?섏뿬 숙박형태 ?섏젙"
                              >
                                {displayAccomType}
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                {displayAccomType}
                              </span>
                            )
                          )}
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {getUserName(complaint.등록자)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(complaint.등록일시)}
                          </span>
                          {complaint.사진 && (
                            <div className="flex gap-1">
                              {complaint.사진.map((img, idx) => (
                                <img 
                                  key={idx}
                                  src={img} 
                                  alt={`사진 ${idx + 1}`} 
                                  className="w-6 h-6 object-cover rounded border border-gray-300 cursor-pointer hover:border-blue-500 transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onImageClick(img);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {expandedId === complaint.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-900">{complaint.내용}</p>
                    </div>

                    {expandedId === complaint.id && (
                      <div className="px-3 pb-3 border-t border-gray-200 pt-3 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">
                            민원내용
                          </label>
                          <textarea
                            key={`edit-content-${complaint.id}`}
                            defaultValue={complaint.내용}
                            onBlur={(e) => { if (e.target.value !== complaint.내용) onUpdate(complaint.id, { 내용: e.target.value }); }}
                            rows={2}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">
                            조치사항
                          </label>
                          <textarea
                            key={`edit-action-${complaint.id}`}
                            defaultValue={complaint.조치사항 || ''}
                            onBlur={(e) => { if (e.target.value !== (complaint.조치사항 || '')) onUpdate(complaint.id, { 조치사항: e.target.value }); }}
                            placeholder="조치사항 입력"
                            rows={2}
                            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          
                          {/* ?곕씫?쇨낵 조치사항*/}
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                ?곕씫??                              </label>
                              <Popover 
                                open={mobileContactDatePopovers[complaint.id]} 
                                onOpenChange={(open) => setMobileContactDatePopovers({...mobileContactDatePopovers, [complaint.id]: open})}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                                    <span className={complaint.연락일? 'text-gray-900' : 'text-gray-500'}>
                                      {complaint.연락일 ? formatShortDate(complaint.연락일) : '미입력'}
                                    </span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={complaint.연락일? new Date(complaint.연락일) : undefined}
                                    onSelect={(date) => {
                                      onUpdate(complaint.id, { 연락일: date?.toISOString() });
                                      setMobileContactDatePopovers({...mobileContactDatePopovers, [complaint.id]: false});
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                조치사항                              </label>
                              <Popover 
                                open={mobileActionDatePopovers[complaint.id]} 
                                onOpenChange={(open) => setMobileActionDatePopovers({...mobileActionDatePopovers, [complaint.id]: open})}
                              >
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                                    <span className={complaint.조치일? 'text-gray-900' : 'text-gray-500'}>
                                      {complaint.조치일 ? formatShortDate(complaint.조치일) : '미입력'}
                                    </span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-md" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={complaint.조치일? new Date(complaint.조치일) : undefined}
                                    onSelect={(date) => {
                                      onUpdate(complaint.id, { 조치일: date?.toISOString() });
                                      setMobileActionDatePopovers({...mobileActionDatePopovers, [complaint.id]: false});
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">
                            처리상태 변경                          </label>
                          <div className="flex gap-1 flex-wrap">
                            {(['접수', '영선팀', '진행중', '부서이관', '외부업체', '완료'] as const).map((status) => (
                              <button
                                key={status}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(complaint.id, status);
                                }}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  complaint.상태 === status
                                    ? status === '접수' ? 'bg-blue-600 text-white'
                                    : status === '영선팀' ? 'bg-teal-600 text-white'
                                    : status === '진행중' ? 'bg-orange-600 text-white'
                                    : status === '부서이관' ? 'bg-purple-600 text-white'
                                    : status === '외부업체' ? 'bg-indigo-600 text-white'
                                    : 'bg-green-600 text-white'
                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {complaint.완료일시 && (
                          <div className="text-xs text-green-600 pt-2 border-t">
                            완료: {formatDateTime(complaint.완료일시)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}

            {/* 테이블 */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
                  <colgroup><col style={{ width: '80px' }} /><col style={{ width: '50px' }} /><col style={{ width: '50px' }} /><col style={{ width: '90px' }} /><col style={{ width: '60px' }} /><col style={{ width: '35%' }} /><col style={{ width: '80px' }} /><col style={{ width: '80px' }} /><col style={{ width: '35%' }} /></colgroup>
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-1 py-2 text-left text-xs font-medium text-gray-700 border-b whitespace-nowrap">상태</th>
                      <th className="px-1 py-2 text-left text-xs font-medium text-gray-700 border-b whitespace-nowrap">차수</th>
                      <th className="px-1 py-2 text-left text-xs font-medium text-gray-700 border-b whitespace-nowrap">호실</th>
                      <th className="px-1 py-2 text-left text-xs font-medium text-gray-700 border-b whitespace-nowrap">구분</th>
                      <th className="px-1 py-2 text-left text-xs font-medium text-gray-700 border-b whitespace-nowrap">등록자</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 border-b">민원내용</th>
                      <th className="px-1 py-2 text-left text-xs font-medium text-gray-700 border-b whitespace-nowrap">연락일</th>
                      <th className="px-1 py-2 text-left text-xs font-medium text-gray-700 border-b whitespace-nowrap">조치일</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-700 border-b">조치사항</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((complaint) => {
                      return (
                        <tr key={complaint.id} className="border-b hover:bg-gray-50">
                          <td className="px-1 py-2 whitespace-nowrap">
                            {editingCell?.id === complaint.id && editingCell.field === '상태' ? (
                              <select
                                value={complaint.상태}
                                onChange={(e) => {
                                  handleStatusChange(complaint.id, e.target.value as any);
                                  setEditingCell(null);
                                }}
                                onBlur={() => setEditingCell(null)}
                                autoFocus
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer ${getStatusColor(complaint.상태)}`}
                                onClick={() => setEditingCell({ id: complaint.id, field: '상태' })}
                              >
                                {complaint.상태}
                              </span>
                            )}
                          </td>
                          <td className="px-1 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">{complaint.차수}차</td>
                          <td className="px-1 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">{complaint.호실}호</td>
                          <td className="px-1 py-2 whitespace-nowrap">
                            {editingCell?.id === complaint.id && editingCell.field === '구분' ? (
                              <select
                                value={complaint.구분}
                                onChange={(e) => {
                                  onUpdate(complaint.id, { 구분: e.target.value as any });
                                  setEditingCell(null);
                                }}
                                onBlur={() => setEditingCell(null)}
                                autoFocus
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="CS">CS</option>
                                <option value="영선">영선</option>
                                <option value="입실">입실</option>
                                <option value="퇴실">퇴실</option>
                                <option value="청소">청소</option>
                              </select>
                            ) : (
                              <span 
                                className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 cursor-pointer"
                                onClick={() => setEditingCell({ id: complaint.id, field: '구분' })}
                              >
                                {complaint.구분}
                              </span>
                            )}
                          </td>
                          <td className="px-1 py-2 whitespace-nowrap">
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">{getUserName(complaint.등록자)}</span>
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900">
                            {editingCell?.id === complaint.id && editingCell.field === '내용' ? (
                              <textarea
                                key={`table-content-${complaint.id}`}
                                defaultValue={complaint.내용}
                                onBlur={(e) => {
                                  if (e.target.value !== complaint.내용) onUpdate(complaint.id, { 내용: e.target.value });
                                  setEditingCell(null);
                                }}
                                rows={2}
                                autoFocus
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                                onClick={() => setEditingCell({ id: complaint.id, field: '?댁슜' })}
                              >
                                {complaint.내용}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-2 text-xs text-gray-600 whitespace-nowrap">
                            <DateCell
                              date={complaint.연락일}
                              onDateChange={(date) => onUpdate(complaint.id, { 연락일: date })}
                              popoverOpen={datePopovers[complaint.id]?.연락일|| false}
                              onPopoverOpenChange={(open) => setDatePopovers({
                                ...datePopovers,
                                [complaint.id]: { ...datePopovers[complaint.id], 연락일: open }
                              })}
                            />
                          </td>
                          <td className="px-1 py-2 text-xs text-gray-600 whitespace-nowrap">
                            <DateCell
                              date={complaint.조치일}
                              onDateChange={(date) => onUpdate(complaint.id, { 조치일: date })}
                              popoverOpen={datePopovers[complaint.id]?.조치일|| false}
                              onPopoverOpenChange={(open) => setDatePopovers({
                                ...datePopovers,
                                [complaint.id]: { ...datePopovers[complaint.id], 조치일: open }
                              })}
                            />
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-900">
                            {editingCell?.id === complaint.id && editingCell.field === '조치사항' ? (
                              <textarea
                                key={`table-action-${complaint.id}`}
                                defaultValue={complaint.조치사항 || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== (complaint.조치사항 || '')) onUpdate(complaint.id, { 조치사항: e.target.value });
                                  setEditingCell(null);
                                }}
                                placeholder="조치사항 입력"
                                rows={2}
                                autoFocus
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                            ) : (
                              <div 
                                className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                                onClick={() => setEditingCell({ id: complaint.id, field: '조치사항' })}
                              >
                                {complaint.조치사항 || '-'}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}