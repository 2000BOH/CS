import { ComplaintForm } from './ComplaintForm';
import { RoomHistory } from './RoomHistory';
import { Complaint, RoomInfo } from '../types';
import { useState } from 'react';

interface InputPageProps {
  onSubmit: (complaint: Omit<Complaint, 'id' | '등록일시' | '등록자'>) => void;
  selectedRoom: { 차수: string; 호실: string };
  onRoomChange: (room: { 차수: string; 호실: string }) => void;
  formRoom: { 차수: string; 호실: string };
  onFormRoomChange: (room: { 차수: string; 호실: string }) => void;
  roomHistoryComplaints: Complaint[];
  onUpdate: (id: string, updates: Partial<Complaint>) => void;
  onRoomUpdate?: (차수: string, 호수: string, updates: Partial<RoomInfo>) => void;
  onImageClick: (image: string) => void;
  onRoomAccommodationTypeUpdate?: (차수: string, 호실: string, 숙박형태: string) => void;
  formRoomAccommodationType?: string;
  onNavigateToHistory?: () => void;
}

export function InputPage({
  onSubmit,
  selectedRoom,
  onRoomChange,
  formRoom,
  onFormRoomChange,
  roomHistoryComplaints,
  onUpdate,
  onRoomUpdate,
  onImageClick,
  onRoomAccommodationTypeUpdate,
  formRoomAccommodationType,
  onNavigateToHistory
}: InputPageProps) {
  const [historyViewMode, setHistoryViewMode] = useState<'card' | 'table'>('card');

  return (
    <>
      {/* 모바일 레이아웃 */}
      <div className="lg:hidden space-y-6">
        <RoomHistory
          selectedRoom={selectedRoom}
          onRoomChange={onRoomChange}
          complaints={roomHistoryComplaints}
          onUpdate={onUpdate}
          onRoomUpdate={onRoomUpdate}
          onImageClick={onImageClick}
          viewMode={historyViewMode}
          onViewModeChange={setHistoryViewMode}
          onRoomAccommodationTypeUpdate={onRoomAccommodationTypeUpdate}
          onNavigateToHistory={onNavigateToHistory}
        />

        <ComplaintForm
          onSubmit={onSubmit}
          selectedRoom={formRoom}
          onRoomChange={onFormRoomChange}
          roomAccommodationType={formRoomAccommodationType}
          onRoomAccommodationTypeUpdate={onRoomAccommodationTypeUpdate}
        />
      </div>

      {/* 데스크톱 레이아웃 - 민원등록(왼쪽) + 오른쪽(호실별이력조회 + 검색결과) */}
      <div className="hidden lg:flex gap-4 w-full">
        {/* 왼쪽: 민원등록 */}
        <div className="flex-shrink-0" style={{ width: '320px' }}>
          <ComplaintForm
            onSubmit={onSubmit}
            selectedRoom={formRoom}
            onRoomChange={onFormRoomChange}
            roomAccommodationType={formRoomAccommodationType}
            onRoomAccommodationTypeUpdate={onRoomAccommodationTypeUpdate}
          />
        </div>

        {/* 오른쪽: 호실별 이력조회 + 검색결과 (하나의 박스, 단일 컴포넌트로 통합) */}
        <div className="flex-1">
          <RoomHistory
            selectedRoom={selectedRoom}
            onRoomChange={onRoomChange}
            complaints={roomHistoryComplaints}
            onUpdate={onUpdate}
            onRoomUpdate={onRoomUpdate}
            onImageClick={onImageClick}
            viewMode={historyViewMode}
            onViewModeChange={setHistoryViewMode}
            onRoomAccommodationTypeUpdate={onRoomAccommodationTypeUpdate}
            compactMode={true}
            inlineMode={true}
            showOnlyList={true}
            noBorder={true}
            onNavigateToHistory={onNavigateToHistory}
          />
        </div>
      </div>
    </>
  );
}