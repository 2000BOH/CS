import { useState, Fragment } from 'react';
import { Complaint } from '../types';
import { ClipboardCheck, ChevronDown, ChevronUp, Star, Calendar as CalendarIcon, Camera } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface RoomCheckPageProps {
  complaints: Complaint[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  onSelectRoom: (complaint: Complaint) => void;
  currentUserId: string; // 현재 로그인한 사용자 ID 추가
}

const inspectorNames = [
  { id: '01', name: '동훈' },
  { id: '02', name: '시우' },
  { id: '03', name: '현석' },
  { id: '04', name: '아름' },
  { id: '05', name: '수용' }
];

interface CheckItem {
  id: string;
  name: string;
  category: 'electric' | 'amenities' | 'condition';
  isOk: boolean;
  actionType?: '영선' | 'CS' | '변상' | '기타';
  description?: string;
  photo?: string;
}

const defaultItems = {
  electric: ["TV", "에어컨 리모컨", "TV 리모컨", "셋톱 리모컨", "비상손전등", "냉장고", "전자레인지", "세탁기", "인덕션", "후드", "에어컨"],
  amenities: ["비누거치대", "건조대", "블라인드", "카드키", "매트리스", "TV장", "싱크대망", "수세미망", "접시건조대"],
  condition: ["바닥 훼손", "벽지 훼손", "화장실 파손", "싱크대 파손"]
};

export function RoomCheckPage({ complaints, onUpdate, onSelectRoom, currentUserId }: RoomCheckPageProps) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [datePopovers, setDatePopovers] = useState<Record<string, boolean>>({});
  const [checkListData, setCheckListData] = useState<Record<string, CheckItem[]>>({});

  const roomCheckList = complaints.filter(c => 
    c.구분 === '퇴실' || c.퇴실상태 === '퇴실'
  );

  // 사용자 ID로부터 이름 가져오기
  const getUserName = (userId: string): string => {
    const userMap: Record<string, string> = {
      '01': '동훈',
      '02': '시우',
      '03': '현석',
      '04': '아름',
      '05': '수용',
      '06': '남식',
      '07': '영선',
      '08': '관리사무소',
      '09': '기타',
      '10': '키핑팀',
    };
    return userMap[userId] || '미지정';
  };

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

  const isPastDue = (dateString: string | undefined, isComplete: boolean) => {
    if (!dateString || isComplete) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const toggleFilter = (filterKey: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterKey)
        ? prev.filter(f => f !== filterKey)
        : [...prev, filterKey]
    );
  };

  const filteredData = selectedFilters.length === 0
    ? roomCheckList
    : roomCheckList.filter(c => {
        const isComplete = c.이상없음건수 !== undefined && c.조치필요건수 !== undefined;
        return selectedFilters.some(filter => {
          switch (filter) {
            case '오늘':
              return isToday(c.퇴실점검일);
            case '내일':
              return isTomorrow(c.퇴실점검일);
            case '예정':
              return isFutureDate(c.퇴실점검일);
            case '미정':
              return !c.퇴실점검일;
            case '미완료':
              return !isComplete && c.퇴실점검일 && isPastDue(c.퇴실점검일, isComplete);
            case '완료':
              return isComplete;
            case '우선처리':
              return c.우선처리 === true;
            default:
              return false;
          }
        });
      });

  const sortedData = [...filteredData].sort((a, b) => {
    const aComplete = a.이상없음건수 !== undefined && a.조치필요건수 !== undefined;
    const bComplete = b.이상없음건수 !== undefined && b.조치필요건수 !== undefined;
    if (aComplete && !bComplete) return 1;
    if (!aComplete && bComplete) return -1;
    
    if (a.퇴실점검일 && b.퇴실점검일) {
      return new Date(a.퇴실점검일).getTime() - new Date(b.퇴실점검일).getTime();
    }
    if (a.퇴실점검일) return -1;
    if (b.퇴실점검일) return 1;
    
    const a차수 = parseInt(a.차수.replace(/[^0-9]/g, '')) || 0;
    const b차수 = parseInt(b.차수.replace(/[^0-9]/g, '')) || 0;
    if (a차수 !== b차수) return a차수 - b차수;
    
    const a호실 = parseInt(a.호실.replace(/[^0-9]/g, '')) || 0;
    const b호실 = parseInt(b.호실.replace(/[^0-9]/g, '')) || 0;
    return a호실 - b호실;
  });

  const filterButtons = [
    { key: '오늘', label: '오늘', count: roomCheckList.filter(c => isToday(c.퇴실점검일)).length },
    { key: '내일', label: '내일', count: roomCheckList.filter(c => isTomorrow(c.퇴실점검일)).length },
    { key: '예정', label: '예정', count: roomCheckList.filter(c => isFutureDate(c.퇴실점검일)).length },
    { key: '미정', label: '미정', count: roomCheckList.filter(c => !c.퇴실점검일).length },
    { 
      key: '미완료', 
      label: '미완료', 
      count: roomCheckList.filter(c => {
        const isComplete = c.이상없음건수 !== undefined && c.조치필요건수 !== undefined;
        return !isComplete && c.퇴실점검일 && isPastDue(c.퇴실점검일, isComplete);
      }).length 
    },
    { key: '완료', label: '완료', count: roomCheckList.filter(c => c.이상없음건수 !== undefined && c.조치필요건수 !== undefined).length },
    { key: '우선처리', label: '우선처리', count: roomCheckList.filter(c => c.우선처리).length },
  ];

  const togglePriority = (id: string, current: boolean | undefined) => {
    onUpdate(id, { 우선처리: !current });
  };

  const initializeCheckList = (complaintId: string, existingData?: string) => {
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData);
        setCheckListData(prev => ({ ...prev, [complaintId]: parsed }));
        return;
      } catch (e) {
        // ignore
      }
    }

    const items: CheckItem[] = [];
    
    defaultItems.electric.forEach((name, idx) => {
      items.push({ id: `el-${idx}`, name, category: 'electric', isOk: true });
    });
    
    defaultItems.amenities.forEach((name, idx) => {
      items.push({ id: `am-${idx}`, name, category: 'amenities', isOk: true });
    });
    
    defaultItems.condition.forEach((name, idx) => {
      items.push({ id: `co-${idx}`, name, category: 'condition', isOk: true });
    });
    
    setCheckListData(prev => ({ ...prev, [complaintId]: items }));
  };

  const toggleExpand = (complaint: Complaint) => {
    if (expandedId === complaint.id) {
      setExpandedId(null);
    } else {
      setExpandedId(complaint.id);
      if (!checkListData[complaint.id]) {
        initializeCheckList(complaint.id, complaint.체크리스트데이터);
      }
      
      // 상세 체크리스트를 펼칠 때 점검자가 없으면 자동으로 현재 사용자로 설정
      if (!complaint.점검자) {
        const inspectorName = getUserName(currentUserId);
        onUpdate(complaint.id, { 점검자: inspectorName });
      }
    }
  };

  const handleItemToggle = (complaintId: string, itemId: string) => {
    setCheckListData(prev => ({
      ...prev,
      [complaintId]: prev[complaintId].map(item =>
        item.id === itemId
          ? { ...item, isOk: !item.isOk, actionType: undefined, description: undefined }
          : item
      )
    }));
  };

  const handleActionSelect = (complaintId: string, itemId: string, actionType: '영선' | 'CS' | '변상' | '기타') => {
    setCheckListData(prev => ({
      ...prev,
      [complaintId]: prev[complaintId].map(item =>
        item.id === itemId ? { ...item, actionType } : item
      )
    }));
  };

  const handleDescriptionChange = (complaintId: string, itemId: string, description: string) => {
    setCheckListData(prev => ({
      ...prev,
      [complaintId]: prev[complaintId].map(item =>
        item.id === itemId ? { ...item, description } : item
      )
    }));
  };

  const handlePhotoUpload = (complaintId: string, itemId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setCheckListData(prev => ({
        ...prev,
        [complaintId]: prev[complaintId].map(item =>
          item.id === itemId ? { ...item, photo: base64 } : item
        )
      }));
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = (complaintId: string, itemId: string) => {
    setCheckListData(prev => ({
      ...prev,
      [complaintId]: prev[complaintId].map(item =>
        item.id === itemId ? { ...item, photo: undefined } : item
      )
    }));
  };

  const toggleCompleteStatus = (id: string, currentIsComplete: boolean) => {
    if (currentIsComplete) {
      onUpdate(id, { 
        이상없음건수: undefined, 
        조치필요건수: undefined 
      });
    } else {
      const checkList = checkListData[id];
      if (checkList) {
        const okCount = checkList.filter(item => item.isOk).length;
        const needCount = checkList.filter(item => !item.isOk).length;
        onUpdate(id, { 이상없음건수: okCount, 조치필요건수: needCount });
      } else {
        const totalItems = defaultItems.electric.length + defaultItems.amenities.length + defaultItems.condition.length;
        onUpdate(id, { 이상없음건수: totalItems, 조치필요건수: 0 });
      }
    }
  };

  const handleSave = (complaint: Complaint) => {
    const checkList = checkListData[complaint.id];
    if (!checkList) return;

    const okCount = checkList.filter(item => item.isOk).length;
    const needCount = checkList.filter(item => !item.isOk).length;

    onUpdate(complaint.id, {
      체크리스트데이터: JSON.stringify(checkList),
      이상없음건수: okCount,
      조치필요건수: needCount
    });

    alert('저장되었습니다.');
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'electric': return '⚡ 전자제품';
      case 'amenities': return '🪑 비품';
      case 'condition': return '🏚️ 시설상태';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
            <h2 className="text-xl font-bold text-gray-900">객실체크 (완료/미완료)</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                전체 {roomCheckList.length}건 | 표시 {sortedData.length}건
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{roomCheckList.length}</div>
            <div className="text-sm text-gray-600">점검 대기</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filterButtons.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedFilters.includes(key)
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* 2열 레이아웃 - 좌우 분할 테이블 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽 테이블 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: '12px' }}>
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap w-8">번호</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-8">우선</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-12">완료</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-10">차수</th>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap w-12">호실</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-14">이상없음</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-14">조치필요</th>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap w-20">퇴실점검일</th>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap w-14">점검자</th>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap">조치사항</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-8">상세</th>
                </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                    점검 대기 중인 객실이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedData.filter((_, i) => i % 2 === 0).map((data, idx) => {
                  const actualIndex = idx * 2;
                  const isExpanded = expandedId === data.id;
                  const checkList = checkListData[data.id] || [];
                  const groupedItems = {
                    electric: checkList.filter(item => item.category === 'electric'),
                    amenities: checkList.filter(item => item.category === 'amenities'),
                    condition: checkList.filter(item => item.category === 'condition')
                  };
                  const isComplete = data.이상없음건수 !== undefined && data.조치필요건수 !== undefined;

                  return [
                    <tr key={`main-${data.id}`} className={`transition-colors ${data.우선처리 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}`}>
                      <td className={`px-2 py-1 text-sm whitespace-nowrap ${isComplete ? 'text-gray-400' : 'text-gray-900'}`}>
                        {actualIndex + 1}
                      </td>

                      <td className="px-1 py-1 text-center whitespace-nowrap">
                        <button
                          onClick={() => togglePriority(data.id, data.우선처리)}
                          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all border-2 ${
                            data.우선처리
                              ? 'bg-yellow-400 border-yellow-500 text-white shadow-md'
                              : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'
                          }`}
                          title={data.우선처리 ? '우선처리 해제' : '우선처리 설정'}
                        >
                          <Star className={`w-4 h-4 ${data.우선처리 ? 'fill-current' : ''}`} />
                        </button>
                      </td>

                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center">
                          <button
                            onClick={() => toggleCompleteStatus(data.id, isComplete)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                              isComplete 
                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {isComplete ? '완료' : '미완료'}
                          </button>
                        </div>
                      </td>

                      <td className={`px-2 py-1 text-sm whitespace-nowrap text-center ${isComplete ? 'text-gray-400' : 'text-gray-900'}`}>
                        {data.차수}
                      </td>

                      <td className={`px-2 py-1 text-sm font-semibold whitespace-nowrap ${isComplete ? 'text-gray-400' : 'text-gray-900'}`}>
                        {data.호실}호
                      </td>

                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          isComplete ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-800'
                        }`}>
                          {data.이상없음건수 !== undefined ? `${data.이상없음건수}건` : '-'}
                        </span>
                      </td>

                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          isComplete ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-800'
                        }`}>
                          {data.조치필요건수 !== undefined ? `${data.조치필요건수}건` : '-'}
                        </span>
                      </td>

                      <td className="px-2 py-1 whitespace-nowrap">
                        <Popover
                          open={datePopovers[data.id]}
                          onOpenChange={(open) => setDatePopovers({ ...datePopovers, [data.id]: open })}
                        >
                          <PopoverTrigger asChild>
                            <button className={`text-sm px-2 py-1 rounded transition-colors ${
                              isComplete ? 'text-gray-400 hover:bg-gray-50' : 'text-gray-900 hover:bg-blue-50'
                            }`}>
                              {data.퇴실점검일 || '미입력'}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white border border-gray-200 rounded-lg shadow-lg" align="start">
                            <Calendar
                              mode="single"
                              selected={data.퇴실점검일 ? new Date(data.퇴실점검일) : undefined}
                              onSelect={(date) => {
                                // 퇴실점검일 선택 시 자동으로 점검자 이름 입력
                                const inspectorName = getUserName(currentUserId);
                                onUpdate(data.id, { 
                                  퇴실점검일: date ? date.toISOString().split('T')[0] : undefined,
                                  점검자: inspectorName
                                });
                                setDatePopovers({ ...datePopovers, [data.id]: false });
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </td>

                      <td className="px-2 py-1 whitespace-nowrap">
                        <div className={`text-sm px-2 py-1 border border-gray-300 rounded bg-gray-50 inline-block min-w-[60px] max-w-[80px] text-center ${
                          isComplete ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {data.점검자 || '-'}
                        </div>
                      </td>

                      <td className={`px-2 py-1 text-sm whitespace-nowrap ${isComplete ? 'text-gray-400' : 'text-gray-900'}`}>
                        <div className="max-w-[200px] truncate" title={data.조치사항}>
                          {data.조치사항 || '-'}
                        </div>
                      </td>

                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <button
                            onClick={() => toggleExpand(data)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className={`w-5 h-5 ${isComplete ? 'text-gray-400' : 'text-gray-600'}`} />
                          ) : (
                            <ChevronDown className={`w-5 h-5 ${isComplete ? 'text-gray-400' : 'text-gray-600'}`} />
                          )}
                        </button>
                      </td>
                    </tr>,

                    isExpanded && (
                      <tr key={`detail-${data.id}`}>
                        <td colSpan={11} className="bg-gray-50 p-6">
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {(['electric', 'amenities', 'condition'] as const).map(category => (
                                <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                                    <h4 className="font-bold text-sm text-gray-900">{getCategoryName(category)}</h4>
                                  </div>
                                  
                                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                    {groupedItems[category].map(item => (
                                      <div key={item.id} className={`p-3 transition-colors ${!item.isOk ? 'bg-red-50' : ''}`}>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-xs font-medium text-gray-900">{item.name}</span>
                                          
                                          <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${item.isOk ? 'text-green-600' : 'text-red-600'}`}>
                                              {item.isOk ? '이상없음' : '조치필요'}
                                            </span>
                                            <label className="relative inline-block w-10 h-5 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={!item.isOk}
                                                onChange={() => handleItemToggle(data.id, item.id)}
                                                className="sr-only peer"
                                              />
                                              <div className="w-10 h-5 bg-green-500 peer-checked:bg-red-500 rounded-full transition-colors"></div>
                                              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow"></div>
                                            </label>
                                          </div>
                                        </div>

                                        {!item.isOk && (
                                          <div className="space-y-2 pt-2 border-t border-gray-200">
                                            <div className="grid grid-cols-4 gap-1">
                                              {(['영선', 'CS', '변상', '기타'] as const).map(type => (
                                                <button
                                                  key={type}
                                                  onClick={() => handleActionSelect(data.id, item.id, type)}
                                                  className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                                                    item.actionType === type
                                                      ? 'bg-gray-800 text-white border-gray-800'
                                                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                                  }`}
                                                >
                                                  {type}
                                                </button>
                                              ))}
                                            </div>

                                            <input
                                              type="text"
                                              value={item.description || ''}
                                              onChange={(e) => handleDescriptionChange(data.id, item.id, e.target.value)}
                                              placeholder="상세 내용 입력"
                                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />

                                            <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                                              <Camera className="w-4 h-4 text-gray-500" />
                                              <span className="text-xs text-gray-700">
                                                {item.photo ? '사진 변경' : '사진 첨부'}
                                              </span>
                                              <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handlePhotoUpload(data.id, item.id, e)}
                                                className="hidden"
                                              />
                                            </label>
                                            
                                            {item.photo && (
                                              <div className="relative">
                                                <img src={item.photo} alt="첨부사진" className="w-full h-32 object-cover rounded border border-gray-300" />
                                                <button
                                                  onClick={() => handlePhotoRemove(data.id, item.id)}
                                                  className="absolute top-1 right-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                >
                                                  제거
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">입주 시 특이사항</label>
                                <textarea
                                  key={`checkin-${data.id}`}
                                  defaultValue={data.입주시특이사항 || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== data.입주시특이사항) {
                                      onUpdate(data.id, { 입주시특이사항: e.target.value });
                                    }
                                  }}
                                  placeholder="입력하세요"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">계약기간 內 특이사항</label>
                                <textarea
                                  key={`contract-${data.id}`}
                                  defaultValue={data.계약기간특이사항 || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== data.계약기간특이사항) {
                                      onUpdate(data.id, { 계약기간특이사항: e.target.value });
                                    }
                                  }}
                                  placeholder="입력하세요"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">퇴거 시 특이사항</label>
                                <textarea
                                  key={`checkout-${data.id}`}
                                  defaultValue={data.퇴실시특이사항 || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== data.퇴실시특이사항) {
                                      onUpdate(data.id, { 퇴실시특이사항: e.target.value });
                                    }
                                  }}
                                  placeholder="입력하세요"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={() => handleSave(data)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors"
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  ];
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* 오른쪽 테이블 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: '12px' }}>
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap w-8">번호</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-8">우선</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-12">완료</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-10">차수</th>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap w-12">호실</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-14">이상없음</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-14">조치필요</th>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap w-20">퇴실점검일</th>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap w-14">점검자</th>
                  <th className="px-1 py-1.5 text-left text-xs font-bold whitespace-nowrap">조치사항</th>
                  <th className="px-1 py-1.5 text-center text-xs font-bold whitespace-nowrap w-8">상세</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.length <= 1 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                      -
                    </td>
                  </tr>
                ) : (
                  sortedData.filter((_, i) => i % 2 === 1).map((data, idx) => {
                    const actualIndex = idx * 2 + 1;
                    const isExpanded = expandedId === data.id;
                    const checkList = checkListData[data.id] || [];
                    const groupedItems = {
                      electric: checkList.filter(item => item.category === 'electric'),
                      amenities: checkList.filter(item => item.category === 'amenities'),
                      condition: checkList.filter(item => item.category === 'condition')
                    };
                    const isComplete = data.이상없음건수 !== undefined && data.조치필요건수 !== undefined;

                    return [
                      <tr key={`main-${data.id}`} className={`transition-colors ${data.우선처리 ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'}`}>
                        <td className={`px-2 py-1 text-sm whitespace-nowrap ${isComplete ? 'text-gray-400' : 'text-gray-900'}`}>
                          {actualIndex + 1}
                        </td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">
                          <button
                            onClick={() => togglePriority(data.id, data.우선처리)}
                            className={`flex items-center justify-center w-7 h-7 rounded-full transition-all border-2 ${
                              data.우선처리
                                ? 'bg-yellow-400 border-yellow-500 text-white shadow-md'
                                : 'bg-white border-gray-300 text-gray-400 hover:border-yellow-400 hover:text-yellow-500'
                            }`}
                            title={data.우선처리 ? '우선처리 해제' : '우선처리 설정'}
                          >
                            <Star className={`w-4 h-4 ${data.우선처리 ? 'fill-current' : ''}`} />
                          </button>
                        </td>
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center justify-center">
                            <button
                              onClick={() => toggleCompleteStatus(data.id, isComplete)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                isComplete 
                                  ? 'bg-green-500 text-white hover:bg-green-600' 
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {isComplete ? '완료' : '미완료'}
                            </button>
                          </div>
                        </td>
                        <td className={`px-2 py-1 text-sm whitespace-nowrap text-center ${isComplete ? 'text-gray-400' : 'text-gray-900'}`}>
                          {data.차수}
                        </td>
                        <td className={`px-2 py-1 text-sm font-semibold whitespace-nowrap ${isComplete ? 'text-gray-400' : 'text-gray-900'}`}>
                          {data.호실}호
                        </td>
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            isComplete ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-800'
                          }`}>
                            {data.이상없음건수 !== undefined ? `${data.이상없음건수}건` : '-'}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            isComplete ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-800'
                          }`}>
                            {data.조치필요건수 !== undefined ? `${data.조치필요건수}건` : '-'}
                          </span>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <Popover
                            open={datePopovers[data.id]}
                            onOpenChange={(open) => setDatePopovers({ ...datePopovers, [data.id]: open })}
                          >
                            <PopoverTrigger asChild>
                              <button className={`text-sm px-2 py-1 rounded transition-colors ${
                                isComplete ? 'text-gray-400 hover:bg-gray-50' : 'text-gray-900 hover:bg-blue-50'
                              }`}>
                                {data.퇴실점검일 || '미입력'}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white border border-gray-200 rounded-lg shadow-lg" align="start">
                              <Calendar
                                mode="single"
                                selected={data.퇴실점검일 ? new Date(data.퇴실점검일) : undefined}
                                onSelect={(date) => {
                                  const inspectorName = getUserName(currentUserId);
                                  onUpdate(data.id, { 
                                    퇴실점검일: date ? date.toISOString().split('T')[0] : undefined,
                                    점검자: inspectorName
                                  });
                                  setDatePopovers({ ...datePopovers, [data.id]: false });
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className={`text-sm px-2 py-1 border border-gray-300 rounded bg-gray-50 inline-block min-w-[60px] max-w-[80px] text-center ${
                            isComplete ? 'text-gray-400' : 'text-gray-900'
                          }`}>
                            {data.점검자 || '-'}
                          </div>
                        </td>
                        <td className={`px-2 py-1 text-sm whitespace-nowrap ${isComplete ? 'text-gray-400' : 'text-gray-900'}`}>
                          <div className="max-w-[200px] truncate" title={data.조치사항}>
                            {data.조치사항 || '-'}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-center whitespace-nowrap">
                          <button
                            onClick={() => toggleExpand(data)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className={`w-5 h-5 ${isComplete ? 'text-gray-400' : 'text-gray-600'}`} />
                            ) : (
                              <ChevronDown className={`w-5 h-5 ${isComplete ? 'text-gray-400' : 'text-gray-600'}`} />
                            )}
                          </button>
                        </td>
                      </tr>,
                      isExpanded && (
                        <tr key={`detail-${data.id}`}>
                          <td colSpan={11} className="bg-gray-50 p-6">
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {(['electric', 'amenities', 'condition'] as const).map(category => (
                                  <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                                      <h4 className="font-bold text-sm text-gray-900">{getCategoryName(category)}</h4>
                                    </div>
                                    
                                    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                                      {groupedItems[category].map(item => (
                                        <div key={item.id} className={`p-3 transition-colors ${!item.isOk ? 'bg-red-50' : ''}`}>
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-900">{item.name}</span>
                                            
                                            <div className="flex items-center gap-2">
                                              <span className={`text-xs font-bold ${item.isOk ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.isOk ? '이상없음' : '조치필요'}
                                              </span>
                                              <label className="relative inline-block w-10 h-5 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={!item.isOk}
                                                  onChange={() => handleItemToggle(data.id, item.id)}
                                                  className="sr-only peer"
                                                />
                                                <div className="w-10 h-5 bg-green-500 peer-checked:bg-red-500 rounded-full transition-colors"></div>
                                                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow"></div>
                                              </label>
                                            </div>
                                          </div>

                                          {!item.isOk && (
                                            <div className="space-y-2 pt-2 border-t border-gray-200">
                                              <div className="grid grid-cols-4 gap-1">
                                                {(['영선', 'CS', '변상', '기타'] as const).map(type => (
                                                  <button
                                                    key={type}
                                                    onClick={() => handleActionSelect(data.id, item.id, type)}
                                                    className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                                                      item.actionType === type
                                                        ? 'bg-gray-800 text-white border-gray-800'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                                                    }`}
                                                  >
                                                    {type}
                                                  </button>
                                                ))}
                                              </div>

                                              <input
                                                type="text"
                                                value={item.description || ''}
                                                onChange={(e) => handleDescriptionChange(data.id, item.id, e.target.value)}
                                                placeholder="상세 내용 입력"
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                              />

                                              <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                                                <Camera className="w-4 h-4 text-gray-500" />
                                                <span className="text-xs text-gray-700">
                                                  {item.photo ? '사진 변경' : '사진 첨부'}
                                                </span>
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  onChange={(e) => handlePhotoUpload(data.id, item.id, e)}
                                                  className="hidden"
                                                />
                                              </label>
                                              
                                              {item.photo && (
                                                <div className="relative">
                                                  <img src={item.photo} alt="첨부사진" className="w-full h-32 object-cover rounded border border-gray-300" />
                                                  <button
                                                    onClick={() => handlePhotoRemove(data.id, item.id)}
                                                    className="absolute top-1 right-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                  >
                                                    제거
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">입주 시 특이사항</label>
                                  <textarea
                                    key={`checkin-${data.id}`}
                                    defaultValue={data.입주시특이사항 || ''}
                                    onBlur={(e) => {
                                      if (e.target.value !== data.입주시특이사항) {
                                        onUpdate(data.id, { 입주시특이사항: e.target.value });
                                      }
                                    }}
                                    placeholder="입력하세요"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">계약기간 內 특이사항</label>
                                  <textarea
                                    key={`contract-${data.id}`}
                                    defaultValue={data.계약기간특이사항 || ''}
                                    onBlur={(e) => {
                                      if (e.target.value !== data.계약기간특이사항) {
                                        onUpdate(data.id, { 계약기간특이사항: e.target.value });
                                      }
                                    }}
                                    placeholder="입력하세요"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">퇴거 시 특이사항</label>
                                  <textarea
                                    key={`checkout-${data.id}`}
                                    defaultValue={data.퇴실시특이사항 || ''}
                                    onBlur={(e) => {
                                      if (e.target.value !== data.퇴실시특이사항) {
                                        onUpdate(data.id, { 퇴실시특이사항: e.target.value });
                                      }
                                    }}
                                    placeholder="입력하세요"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <button
                                  onClick={() => handleSave(data)}
                                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors"
                                >
                                  저장
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    ];
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}