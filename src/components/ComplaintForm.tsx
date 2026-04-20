import { useState, useRef, useEffect } from 'react';
import { Plus, Upload, X, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import type { Complaint, RoomInfo } from '../types';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { dateToShortString } from '../utils/dateFormat';
import { getRoomInfo, roomDatabase } from '../data/roomData';

interface ComplaintFormProps {
  onSubmit: (complaint: Omit<Complaint, 'id' | '등록일시' | '등록자'>) => void;
  selectedRoom: { 차수: string; 호실: string };
  onRoomChange: (room: { 차수: string; 호실: string }) => void;
  roomAccommodationType?: string;
  onRoomAccommodationTypeUpdate?: (차수: string, 호실: string, 숙박형태: string) => void;
}

const CATEGORIES = [
  '🔒 도어락',
  '🔧 배관·누수·수도',
  '❄️ 냉난방·에어컨',
  '🏠 시설하자·보수',
  '📺 TV·인터넷·셋탑',
  '🌀 세탁기·인덕션',
  '🔇 소음·담배·벌레',
  '⚡ 전기·콘센트',
  '🛏️ 매트리스·가구',
  '🚗 주차·차량',
  '📋 계약·관리비',
  '👥 객실이동·배정',
  '기타',
];

export function ComplaintForm({ onSubmit, selectedRoom, onRoomChange, onRoomUpdate }: ComplaintFormProps) {
  const [formData, setFormData] = useState({
    구분: '',
    내용: '',
    조치사항: '',
    상태: '접수' as Complaint['상태'],
    사진: [] as string[],
    연락일: undefined as Date | undefined,
    조치일: undefined as Date | undefined
  });
  const [isContactDateOpen, setIsContactDateOpen] = useState(false);
  const [isActionDateOpen, setIsActionDateOpen] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const 호실InputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const roomInfo = getRoomInfo(selectedRoom.차수, selectedRoom.호실);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).slice(0, 5 - formData.사진.length).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, 사진: [...prev.사진, reader.result as string] }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData({ ...formData, 사진: formData.사진.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoom.차수 || !selectedRoom.호실) {
      alert('차수와 호실을 입력해주세요.');
      return;
    }

    onSubmit({
      차수: selectedRoom.차수,
      호실: selectedRoom.호실,
      구분: formData.구분 || '기타',
      내용: formData.내용 || '(내용 없음)',
      조치사항: formData.조치사항,
      상태: formData.상태,
      완료일시: formData.상태 === '완료' ? new Date().toISOString() : undefined,
      사진: formData.사진,
      연락일: formData.연락일?.toISOString(),
      조치일: formData.조치일?.toISOString()
    });

    setFormData({
      구분: '',
      내용: '',
      조치사항: '',
      상태: '접수',
      사진: [],
      연락일: undefined,
      조치일: undefined
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-full">
      <div
        className={`flex items-center justify-between ${isMobile ? 'cursor-pointer' : ''}`}
        onClick={() => isMobile && setIsFormExpanded(!isFormExpanded)}
      >
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          민원 등록
        </h2>
        {isMobile && (
          <button
            type="button"
            className="text-gray-600 hover:text-gray-900 transition-colors mb-4"
            onClick={(e) => { e.stopPropagation(); setIsFormExpanded(!isFormExpanded); }}
          >
            {isFormExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </button>
        )}
      </div>

      {(!isMobile || isFormExpanded) && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 차수 / 호실 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">차수</label>
              <input
                type="text"
                value={selectedRoom.차수}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  onRoomChange({ ...selectedRoom, 차수: value });
                  if (value.length === 1) setTimeout(() => 호실InputRef.current?.focus(), 0);
                }}
                onFocus={() => onRoomChange({ ...selectedRoom, 차수: '' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">호실</label>
              <input
                ref={호실InputRef}
                type="text"
                value={selectedRoom.호실}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  onRoomChange({ ...selectedRoom, 호실: value });
                }}
                onFocus={() => onRoomChange({ ...selectedRoom, 호실: '' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 객실 정보 표시 */}
          {selectedRoom.차수 && selectedRoom.호실 && (
            <div className={`rounded-md px-3 py-3 text-xs space-y-1 ${roomInfo ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200 text-gray-400'}`}>
              {roomInfo ? (
                <>
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-gray-600 w-16 shrink-0">숙박형태</span>
                    <span className="text-blue-800 font-bold">{roomInfo.숙박형태 || '-'}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-gray-600 w-16 shrink-0">입주민</span>
                    <span className="text-gray-900 font-medium">{roomInfo.입주민 || '-'}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-gray-600 w-16 shrink-0">전화번호</span>
                    <span className="text-gray-900 font-medium">{roomInfo.전화번호 || '-'}</span>
                  </div>
                  {roomInfo.운영종료일 && (
                    <div className="flex gap-2 items-center">
                      <span className="font-semibold text-gray-600 w-16 shrink-0">종료일</span>
                      <span className="text-red-600 font-medium">{roomInfo.운영종료일}</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="font-medium">등록된 객실 정보가 없습니다</span>
              )}
            </div>
          )}

          {/* 분류 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">분류</label>
            <select
              value={formData.구분}
              onChange={(e) => setFormData({ ...formData, 구분: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">선택</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">내용</label>
            <textarea
              value={formData.내용}
              onChange={(e) => setFormData(prev => ({ ...prev, 내용: e.target.value }))}
              placeholder="민원 내용을 입력하세요"
              rows={3}
              autoComplete="off"
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 결과(비고) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">결과(비고)</label>
            <textarea
              value={formData.조치사항}
              onChange={(e) => setFormData(prev => ({ ...prev, 조치사항: e.target.value }))}
              placeholder="조치 결과를 입력하세요"
              rows={2}
              autoComplete="off"
              className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            {/* 처리상태 */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">처리상태</label>
              <select
                value={formData.상태}
                onChange={(e) => setFormData(prev => ({ ...prev, 상태: e.target.value as Complaint['상태'] }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="접수">접수</option>
                <option value="처리중">처리중</option>
                <option value="영선이관">영선이관</option>
                <option value="외부업체">외부업체</option>
                <option value="완료">완료</option>
                <option value="퇴실">퇴실</option>
              </select>
            </div>

            {/* 연락일 / 조치일 */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">연락일</label>
                <Popover open={isContactDateOpen} onOpenChange={setIsContactDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center gap-2"
                    >
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className={formData.연락일 ? 'text-gray-900' : 'text-gray-500'}>
                        {formData.연락일 ? dateToShortString(formData.연락일) : '날짜 선택'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.연락일}
                      onSelect={(date) => { setFormData({ ...formData, 연락일: date }); setIsContactDateOpen(false); }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">조치일</label>
                <Popover open={isActionDateOpen} onOpenChange={setIsActionDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center gap-2"
                    >
                      <CalendarIcon className="w-4 h-4 text-gray-400" />
                      <span className={formData.조치일 ? 'text-gray-900' : 'text-gray-500'}>
                        {formData.조치일 ? dateToShortString(formData.조치일) : '날짜 선택'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0 shadow-lg rounded-lg" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.조치일}
                      onSelect={(date) => { setFormData({ ...formData, 조치일: date }); setIsActionDateOpen(false); }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* 사진 첨부 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">사진 첨부 (최대 5개)</label>
            {formData.사진.length < 5 && (
              <label className="flex items-center justify-center w-full px-3 py-2.5 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-400 transition-colors mb-2">
                <Upload className="w-4 h-4 mr-2 text-gray-400" />
                <span className="text-sm text-gray-600">사진 선택 ({formData.사진.length}/5)</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>
            )}
            {formData.사진.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {formData.사진.map((img, index) => (
                  <div key={index} className="relative">
                    <img src={img} alt={`첨부 사진 ${index + 1}`} className="w-full h-14 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2.5 rounded hover:bg-blue-700 transition-colors font-semibold text-sm"
          >
            민원 등록하기
          </button>
        </form>
      )}
    </div>
  );
}
