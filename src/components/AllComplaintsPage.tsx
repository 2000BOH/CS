import { StatsSidebar } from './StatsSidebar';
import { ComplaintList } from './ComplaintList';
import { Complaint } from '../types';

interface AllComplaintsPageProps {
  stats: {
    전체: number;
    접수: number;
    처리중: number;
    영선이관: number;
    외부업체: number;
    완료: number;
    // 하위호환
    영선팀?: number;
    진행중?: number;
    부서이관?: number;
    청소요청?: number;
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
  selectedDateFilter: string | null;
  onStatusSelect: (status: string | null) => void;
  onCategorySelect: (category: string | null) => void;
  onDateFilterSelect: (filter: string | null) => void;
  complaints: Complaint[];
  filteredComplaints: Complaint[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  onImageClick: (image: string) => void;
}

export function AllComplaintsPage({
  stats,
  categories,
  selectedStatus,
  selectedCategory,
  selectedDateFilter,
  onStatusSelect,
  onCategorySelect,
  onDateFilterSelect,
  complaints,
  filteredComplaints,
  onUpdate,
  onImageClick
}: AllComplaintsPageProps) {
  return (
    <>
      {/* 모바일 레이아웃 */}
      <div className="lg:hidden space-y-6">
        <StatsSidebar
          stats={stats}
          categories={categories}
          selectedStatus={selectedStatus}
          selectedCategory={selectedCategory}
          onStatusSelect={onStatusSelect}
          onCategorySelect={onCategorySelect}
          complaints={complaints}
          selectedDateFilter={selectedDateFilter}
          onDateFilterSelect={onDateFilterSelect}
          isMobile={true}
        />
        
        <ComplaintList 
          complaints={filteredComplaints}
          onUpdate={onUpdate}
          selectedStatus={selectedStatus}
          selectedCategory={selectedCategory}
          onImageClick={onImageClick}
        />
      </div>

      {/* 데스크톱 레이아웃 */}
      <div className="hidden lg:block space-y-4">
        <StatsSidebar
          stats={stats}
          categories={categories}
          selectedStatus={selectedStatus}
          selectedCategory={selectedCategory}
          onStatusSelect={onStatusSelect}
          onCategorySelect={onCategorySelect}
          complaints={complaints}
          selectedDateFilter={selectedDateFilter}
          onDateFilterSelect={onDateFilterSelect}
          isMobile={false}
          isHorizontal={true}
        />

        <ComplaintList 
          complaints={filteredComplaints}
          onUpdate={onUpdate}
          selectedStatus={selectedStatus}
          selectedCategory={selectedCategory}
          onImageClick={onImageClick}
          isDesktopWide={true}
        />
      </div>
    </>
  );
}