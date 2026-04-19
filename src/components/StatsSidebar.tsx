import { BarChart3, FolderOpen } from 'lucide-react';

interface StatsSidebarProps {
  stats: {
    전체: number;
    접수: number;
    처리중: number;
    영선이관: number;
    외부업체: number;
    완료: number;
  };
  categories: {
    '영선': number;
    'CS': number;
    '입실': number;
    '퇴실': number;
    '청소': number;
  };
  selectedStatus: string | null;
  selectedCategory: string | null;
  onStatusSelect: (status: string | null) => void;
  onCategorySelect: (category: string | null) => void;
  isMobile: boolean;
  complaints: Array<{ 상태: string; 등록일시: string; 완료일시?: string }>;
  selectedDateFilter: string | null;
  onDateFilterSelect: (filter: string | null) => void;
  isHorizontal?: boolean;
}

export function StatsSidebar({
  stats,
  categories,
  selectedStatus,
  selectedCategory,
  onStatusSelect,
  onCategorySelect,
  isMobile,
  complaints,
  selectedDateFilter,
  onDateFilterSelect,
  isHorizontal
}: StatsSidebarProps) {
  const statusButtons = [
    { key: '전체', label: '전체', color: 'bg-slate-600', textColor: 'text-slate-600', count: stats.전체 },
    { key: '접수', label: '접수', color: 'bg-blue-500', textColor: 'text-blue-600', count: stats.접수 },
    { key: '처리중', label: '처리중', color: 'bg-orange-500', textColor: 'text-orange-600', count: stats.처리중 },
    { key: '영선이관', label: '영선이관', color: 'bg-teal-500', textColor: 'text-teal-600', count: stats.영선이관 },
    { key: '외부업체', label: '외부업체', color: 'bg-indigo-500', textColor: 'text-indigo-600', count: stats.외부업체 },
    { key: '완료', label: '완료', color: 'bg-green-500', textColor: 'text-green-600', count: stats.완료 },
  ];

  const categoryButtons = [
    { key: '전체', label: '전체', color: 'bg-slate-600', textColor: 'text-slate-600', count: Object.values(categories).reduce((a, b) => a + b, 0) },
    { key: '영선', label: '영선', color: 'bg-red-500', textColor: 'text-red-600', count: categories['영선'] },
    { key: 'CS', label: 'CS', color: 'bg-pink-500', textColor: 'text-pink-600', count: categories['CS'] },
    { key: '입실', label: '입실', color: 'bg-cyan-500', textColor: 'text-cyan-600', count: categories['입실'] },
    { key: '퇴실', label: '퇴실', color: 'bg-amber-500', textColor: 'text-amber-600', count: categories['퇴실'] },
    { key: '청소', label: '청소', color: 'bg-lime-500', textColor: 'text-lime-600', count: categories['청소'] },
  ];

  const handleStatusClick = (key: string) => {
    if (key === '전체') {
      onStatusSelect(null);
    } else {
      onStatusSelect(selectedStatus === key ? null : key);
    }
  };

  const handleCategoryClick = (key: string) => {
    if (key === '전체') {
      onCategorySelect(null);
    } else {
      onCategorySelect(selectedCategory === key ? null : key);
    }
  };

  const handleDateFilterClick = (filter: string) => {
    if (filter === '전체') {
      onDateFilterSelect(null);
    } else {
      onDateFilterSelect(selectedDateFilter === filter ? null : filter);
    }
  };

  // 날짜 비교 헬퍼 함수
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isThisWeek = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // 토요일
    endOfWeek.setHours(23, 59, 59, 999);
    return date >= startOfWeek && date <= endOfWeek;
  };

  // 날짜 필터 통계 계산
  const dateFilters = {
    '오늘 연락': complaints.filter(c => c.상태 !== '접수' && isToday(c.등록일시)).length,
    '오늘 조치': complaints.filter(c => c.상태 === '완료' && c.완료일시 && isToday(c.완료일시)).length,
    '이번주 연락': complaints.filter(c => c.상태 !== '접수' && isThisWeek(c.등록일시)).length,
    '이번주 조치': complaints.filter(c => c.상태 === '완료' && c.완료일시 && isThisWeek(c.완료일시)).length,
    '미연락': complaints.filter(c => c.상태 === '접수').length,
    '미조치': complaints.filter(c => c.상태 !== '완료').length,
  };

  const dateFilterButtons = [
    { key: '전체', label: '전체', color: 'bg-slate-600', textColor: 'text-slate-600', count: complaints.length },
    { key: '오늘 연락', label: '오늘 연락', color: 'bg-sky-500', textColor: 'text-sky-600', count: dateFilters['오늘 연락'] },
    { key: '오늘 조치', label: '오늘 조치', color: 'bg-emerald-500', textColor: 'text-emerald-600', count: dateFilters['오늘 조치'] },
    { key: '이번주 연락', label: '이번주 연락', color: 'bg-violet-500', textColor: 'text-violet-600', count: dateFilters['이번주 연락'] },
    { key: '이번주 조치', label: '이번주 조치', color: 'bg-lime-500', textColor: 'text-lime-600', count: dateFilters['이번주 조치'] },
    { key: '미연락', label: '미연락', color: 'bg-rose-500', textColor: 'text-rose-600', count: dateFilters['미연락'] },
    { key: '미조치', label: '미조치', color: 'bg-amber-500', textColor: 'text-amber-600', count: dateFilters['미조치'] },
  ];

  // 모바일 레이아웃
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* 처리상태 */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-sm">
            <BarChart3 className="w-4 h-4" />
            처리상태
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {statusButtons.map((status) => (
              <button
                key={status.key}
                onClick={() => handleStatusClick(status.key)}
                className={`px-2 py-1.5 rounded text-xs transition-all whitespace-nowrap ${
                  (status.key === '전체' && selectedStatus === null) ||
                  selectedStatus === status.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="font-medium">{status.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 선택사항 */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-sm">
            <FolderOpen className="w-4 h-4" />
            선택사항
          </h3>
          <div className="grid grid-cols-3 gap-1.5">
            {categoryButtons.map((category) => (
              <button
                key={category.key}
                onClick={() => handleCategoryClick(category.key)}
                className={`px-2 py-1.5 rounded text-xs transition-all whitespace-nowrap ${
                  (category.key === '전체' && selectedCategory === null) ||
                  selectedCategory === category.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="font-medium">{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 날짜필터 */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-sm">
            <FolderOpen className="w-4 h-4" />
            날짜필터
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {dateFilterButtons.map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleDateFilterClick(filter.key)}
                className={`px-1.5 py-1.5 rounded text-xs transition-all whitespace-nowrap ${
                  (filter.key === '전체' && selectedDateFilter === null) ||
                  selectedDateFilter === filter.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="font-medium text-xs">{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 가로 레이아웃 (데스크톱 전용)
  if (isHorizontal) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {/* 처리상태 - 블루 테마 */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm border border-blue-200 p-3">
          <h3 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1.5 tracking-wide">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            처리상태
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {statusButtons.map((status) => {
              const isSelected = (status.key === '전체' && selectedStatus === null) || selectedStatus === status.key;
              return (
                <button
                  key={status.key}
                  onClick={() => handleStatusClick(status.key)}
                  className={`px-2 py-1.5 rounded text-xs transition-all border ${
                    isSelected
                      ? 'bg-blue-500 border-blue-600 shadow-sm text-white'
                      : 'bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                      {status.label}
                    </span>
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : status.textColor}`}>
                      {status.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택사항 - 퍼플 테마 */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-sm border border-purple-200 p-3">
          <h3 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-1.5 tracking-wide">
            <FolderOpen className="w-4 h-4 text-purple-600" />
            구분
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {categoryButtons.map((category) => {
              const isSelected = (category.key === '전체' && selectedCategory === null) || selectedCategory === category.key;
              return (
                <button
                  key={category.key}
                  onClick={() => handleCategoryClick(category.key)}
                  className={`px-2 py-1.5 rounded text-xs transition-all border ${
                    isSelected
                      ? 'bg-purple-500 border-purple-600 shadow-sm text-white'
                      : 'bg-white border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                      {category.label}
                    </span>
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : category.textColor}`}>
                      {category.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 날짜필터 - 그린 테마 */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg shadow-sm border border-emerald-200 p-3">
          <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-1.5 tracking-wide">
            <FolderOpen className="w-4 h-4 text-emerald-600" />
            날짜필터
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {dateFilterButtons.map((filter) => {
              const isSelected = (filter.key === '전체' && selectedDateFilter === null) || selectedDateFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => handleDateFilterClick(filter.key)}
                  className={`px-1.5 py-1.5 rounded text-xs transition-all border whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-600 shadow-sm text-white'
                      : 'bg-white border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                      {filter.label}
                    </span>
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : filter.textColor}`}>
                      {filter.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 데스크톱 레이아웃
  return (
    <div className="space-y-3">
      {/* 처리상태 */}
      <div className="bg-white rounded-lg shadow-md p-2">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1 text-xs">
          <BarChart3 className="w-3.5 h-3.5" />
          처리상태
        </h3>
        <div className="space-y-1">
          {statusButtons.map((status) => (
            <button
              key={status.key}
              onClick={() => handleStatusClick(status.key)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                (status.key === '전체' && selectedStatus === null) ||
                selectedStatus === status.key
                  ? 'bg-blue-50 border border-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${
                  (status.key === '전체' && selectedStatus === null) ||
                  selectedStatus === status.key
                    ? status.textColor
                    : 'text-gray-700'
                }`}>
                  {status.label}
                </span>
                <span className={`text-sm font-bold ${status.textColor}`}>
                  {status.count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 선택사항 (카테고리) */}
      <div className="bg-white rounded-lg shadow-md p-2">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1 text-xs">
          <FolderOpen className="w-3.5 h-3.5" />
          선택사항
        </h3>
        <div className="space-y-1">
          {categoryButtons.map((category) => (
            <button
              key={category.key}
              onClick={() => handleCategoryClick(category.key)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                (category.key === '전체' && selectedCategory === null) ||
                selectedCategory === category.key
                  ? 'bg-blue-50 border border-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${
                  (category.key === '전체' && selectedCategory === null) ||
                  selectedCategory === category.key
                    ? category.textColor
                    : 'text-gray-700'
                }`}>
                  {category.label}
                </span>
                <span className={`text-sm font-bold ${category.textColor}`}>
                  {category.count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 날짜 필터 */}
      <div className="bg-white rounded-lg shadow-md p-2">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1 text-xs">
          <FolderOpen className="w-3.5 h-3.5" />
          날짜 필터
        </h3>
        <div className="space-y-1">
          {dateFilterButtons.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleDateFilterClick(filter.key)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                (filter.key === '전체' && selectedDateFilter === null) ||
                selectedDateFilter === filter.key
                  ? 'bg-blue-50 border border-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${
                  (filter.key === '전체' && selectedDateFilter === null) ||
                  selectedDateFilter === filter.key
                    ? filter.textColor
                    : 'text-gray-700'
                }`}>
                  {filter.label}
                </span>
                <span className={`text-sm font-bold ${filter.textColor}`}>
                  {filter.count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}