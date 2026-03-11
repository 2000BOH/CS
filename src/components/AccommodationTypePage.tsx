import { useMemo, useState } from 'react';
import { RoomInfo } from '../App';
import { ArrowLeft } from 'lucide-react';

interface AccommodationTypePageProps {
  rooms: RoomInfo[];
  onNavigateToInput?: () => void;
}

export function AccommodationTypePage({ rooms, onNavigateToInput }: AccommodationTypePageProps) {
  const [detailView, setDetailView] = useState<{
    type: '운영방식' | '숙박형태';
    category: string;
    차수: string;
  } | null>(null);

  // 운영방식별 통계 계산
  const operationStats = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {
      '1차': {},
      '2차': {},
      '3차': {},
      '4차': {},
      'Total': {}
    };

    rooms.forEach(room => {
      const 차수 = room.차수.includes('1') ? '1차' :
                 room.차수.includes('2') ? '2차' :
                 room.차수.includes('3') ? '3차' :
                 room.차수.includes('4') ? '4차' : '';
      
      if (!차수) return;

      const 숙박형태 = room.숙박형태 || '기타';
      
      if (!stats[차수][숙박형태]) {
        stats[차수][숙박형태] = 0;
      }
      stats[차수][숙박형태]++;
      
      if (!stats['Total'][숙박형태]) {
        stats['Total'][숙박형태] = 0;
      }
      stats['Total'][숙박형태]++;
    });

    return stats;
  }, [rooms]);

  // 숙박형태별 통계 계산
  const accommodationStats = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {
      '1차': {},
      '2차': {},
      '3차': {},
      '4차': {},
      'Total': {}
    };

    rooms.forEach(room => {
      const 차수 = room.차수.includes('1') ? '1차' :
                 room.차수.includes('2') ? '2차' :
                 room.차수.includes('3') ? '3차' :
                 room.차수.includes('4') ? '4차' : '';
      
      if (!차수) return;

      const 숙박형태 = room.숙박형태 || '기타';
      
      if (!stats[차수][숙박형태]) {
        stats[차수][숙박형태] = 0;
      }
      stats[차수][숙박형태]++;
      
      if (!stats['Total'][숙박형태]) {
        stats['Total'][숙박형태] = 0;
      }
      stats['Total'][숙박형태]++;
    });

    return stats;
  }, [rooms]);

  // 필터링된 객실 목록
  const filteredRooms = useMemo(() => {
    if (!detailView) return [];
    
    return rooms.filter(room => {
      const room차수 = room.차수.includes('1') ? '1차' :
                     room.차수.includes('2') ? '2차' :
                     room.차수.includes('3') ? '3차' :
                     room.차수.includes('4') ? '4차' : '';
      
      const 숙박형태 = room.숙박형태 || '기타';
      
      // Total인 경우 해당 category의 모든 차수
      if (detailView.차수 === 'Total') {
        return 숙박형태 === detailView.category;
      }
      
      return room차수 === detailView.차수 && 숙박형태 === detailView.category;
    }).sort((a, b) => {
      const a호실 = parseInt((a.호실 || '').replace(/[^0-9]/g, '')) || 0;
      const b호실 = parseInt((b.호실 || '').replace(/[^0-9]/g, '')) || 0;
      return a호실 - b호실;
    });
  }, [rooms, detailView]);

  // 각 차수별 합계 계산
  const getRowTotal = (차수: string, data: Record<string, Record<string, number>>) => {
    return Object.values(data[차수] || {}).reduce((sum, val) => sum + val, 0);
  };
  
  // 각 항목별 합계 계산
  const getColumnTotal = (type: string, data: Record<string, Record<string, number>>) => {
    return ['1차', '2차', '3차', '4차'].reduce((sum, 차수) => sum + (data[차수]?.[type] || 0), 0);
  };

  // 클릭 핸들러
  const handleCellClick = (type: '운영방식' | '숙박형태', category: string, 차수: string, count: number) => {
    if (count > 0) {
      setDetailView({ type, category, 차수 });
    }
  };

  // 운영방식 항목들
  const operationTypes = ['기본', '인스11%', '인스19%', '인스스위트', '통합_대원', '통합_개인', '자기관리', '자기운영', '잔금대기', '잔금완료'];
  
  // 숙박형태 항목들
  const accommodationTypes = ['인스파이어', '장박_개인', '장박_법인', '호텔', '기숙사', '입실예정', '계약만료', '공실 보수중', '사용금지', '퇴실'];

  // 세부 현황 보기
  if (detailView) {
    return (
      <div className="space-y-4">
        {/* 뒤로가기 버튼 */}
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
          <button
            onClick={() => setDetailView(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            숙박형태 표로 돌아가기
          </button>
          {onNavigateToInput && (
            <button
              type="button"
              onClick={onNavigateToInput}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              입력페이지
            </button>
          )}
        </div>

        {/* 세부 현황 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {detailView.type === '운영방식' ? '📊 운영방식' : '🏨 숙박형태'} 세부 현황
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {detailView.차수} &gt; {detailView.category} ({filteredRooms.length}건)
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900">번호</th>
                  <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900">차수</th>
                  <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900">호실</th>
                  <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900">숙박형태</th>
                  <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900">입실일</th>
                  <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900">퇴실일</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-gray-400 px-4 py-8 text-center text-gray-500">
                      해당하는 객실이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room, index) => (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="border border-gray-400 px-4 py-3 text-center text-gray-900">{index + 1}</td>
                      <td className="border border-gray-400 px-4 py-3 text-center text-gray-900">{room.차수}</td>
                      <td className="border border-gray-400 px-4 py-3 text-center font-semibold text-gray-900">{room.호실}호</td>
                      <td className="border border-gray-400 px-4 py-3 text-center text-gray-900">{room.숙박형태 || '-'}</td>
                      <td className="border border-gray-400 px-4 py-3 text-center text-gray-900">{room.입실일 || '-'}</td>
                      <td className="border border-gray-400 px-4 py-3 text-center text-gray-900">{room.퇴실일 || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 운영방식 표 - 데스크톱 */}
      <div className="bg-white rounded-lg shadow-md p-6 hidden lg:block">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📊 운영방식</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-base">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-4 py-3 text-left font-bold text-gray-900">차수</th>
                {operationTypes.map(type => (
                  <th key={type} className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 whitespace-nowrap">{type}</th>
                ))}
                <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 bg-blue-100 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {['1차', '2차', '3차', '4차', 'Total'].map((차수) => {
                const rowTotal = getRowTotal(차수, operationStats);
                const isTotal = 차수 === 'Total';
                
                return (
                  <tr key={차수} className={isTotal ? 'bg-blue-100 font-bold' : 'hover:bg-gray-50'}>
                    <td className="border border-gray-400 px-4 py-3 font-semibold text-gray-900">{차수}</td>
                    {operationTypes.map(type => {
                      const count = operationStats[차수]?.[type] || 0;
                      return (
                        <td 
                          key={type} 
                          className={`border border-gray-400 px-4 py-3 text-center text-gray-900 ${count > 0 ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
                          onClick={() => handleCellClick('운영방식', type, 차수, count)}
                        >
                          {count > 0 ? (
                            <span className="text-blue-600 font-medium underline decoration-dotted">{count}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-gray-400 px-4 py-3 text-center bg-blue-200 font-bold text-gray-900">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 운영방식 표 - 모바일 (행과 열 바뀜) */}
      <div className="bg-white rounded-lg shadow-md p-4 lg:hidden">
        <h2 className="text-lg font-bold text-gray-900 mb-3">📊 운영방식</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-2 py-2 text-left font-bold text-gray-900 sticky left-0 bg-gray-200 z-10">구분</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">1차</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">2차</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">3차</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">4차</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 bg-blue-100 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {operationTypes.map((type) => {
                const columnTotal = getColumnTotal(type, operationStats);
                
                return (
                  <tr key={type} className="hover:bg-gray-50">
                    <td className="border border-gray-400 px-2 py-2 font-semibold text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap">{type}</td>
                    {['1차', '2차', '3차', '4차'].map(차수 => {
                      const count = operationStats[차수]?.[type] || 0;
                      return (
                        <td 
                          key={차수}
                          className={`border border-gray-400 px-2 py-2 text-center text-gray-900 ${count > 0 ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
                          onClick={() => handleCellClick('운영방식', type, 차수, count)}
                        >
                          {count > 0 ? (
                            <span className="text-blue-600 font-medium underline decoration-dotted">{count}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td 
                      className={`border border-gray-400 px-2 py-2 text-center bg-blue-200 font-bold text-gray-900 ${columnTotal > 0 ? 'cursor-pointer hover:bg-blue-300 transition-colors' : ''}`}
                      onClick={() => handleCellClick('운영방식', type, 'Total', columnTotal)}
                    >
                      {columnTotal > 0 ? (
                        <span className="text-blue-700 underline decoration-dotted">{columnTotal}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Total 행 */}
              <tr className="bg-blue-100 font-bold">
                <td className="border border-gray-400 px-2 py-2 font-bold text-gray-900 sticky left-0 bg-blue-100 z-10">Total</td>
                <td className="border border-gray-400 px-2 py-2 text-center text-gray-900">{getRowTotal('1차', operationStats)}</td>
                <td className="border border-gray-400 px-2 py-2 text-center text-gray-900">{getRowTotal('2차', operationStats)}</td>
                <td className="border border-gray-400 px-2 py-2 text-center text-gray-900">{getRowTotal('3차', operationStats)}</td>
                <td className="border border-gray-400 px-2 py-2 text-center text-gray-900">{getRowTotal('4차', operationStats)}</td>
                <td className="border border-gray-400 px-2 py-2 text-center bg-blue-200 font-bold text-gray-900">{getRowTotal('Total', operationStats)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 숙박형태 표 - 데스크톱 */}
      <div className="bg-white rounded-lg shadow-md p-6 hidden lg:block">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🏨 숙박형태</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-base">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-4 py-3 text-left font-bold text-gray-900">차수</th>
                {accommodationTypes.map(type => (
                  <th key={type} className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 whitespace-nowrap">{type}</th>
                ))}
                <th className="border border-gray-400 px-4 py-3 text-center font-bold text-gray-900 bg-blue-100 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {['1차', '2차', '3차', '4차', 'Total'].map((차수) => {
                const rowTotal = getRowTotal(차수, accommodationStats);
                const isTotal = 차수 === 'Total';
                
                return (
                  <tr key={차수} className={isTotal ? 'bg-blue-100 font-bold' : 'hover:bg-gray-50'}>
                    <td className="border border-gray-400 px-4 py-3 font-semibold text-gray-900">{차수}</td>
                    {accommodationTypes.map(type => {
                      const count = accommodationStats[차수]?.[type] || 0;
                      return (
                        <td 
                          key={type} 
                          className={`border border-gray-400 px-4 py-3 text-center text-gray-900 ${count > 0 ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
                          onClick={() => handleCellClick('숙박형태', type, 차수, count)}
                        >
                          {count > 0 ? (
                            <span className="text-blue-600 font-medium underline decoration-dotted">{count}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-gray-400 px-4 py-3 text-center bg-blue-200 font-bold text-gray-900">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 숙박형태 표 - 모바일 (행과 열 바뀜) */}
      <div className="bg-white rounded-lg shadow-md p-4 lg:hidden">
        <h2 className="text-lg font-bold text-gray-900 mb-3">🏨 숙박형태</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 px-2 py-2 text-left font-bold text-gray-900 sticky left-0 bg-gray-200 z-10">구분</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">1차</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">2차</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">3차</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 whitespace-nowrap">4차</th>
                <th className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-900 bg-blue-100 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {accommodationTypes.map((type) => {
                const columnTotal = getColumnTotal(type, accommodationStats);
                
                return (
                  <tr key={type} className="hover:bg-gray-50">
                    <td className="border border-gray-400 px-2 py-2 font-semibold text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap">{type}</td>
                    {['1차', '2차', '3차', '4차'].map(차수 => {
                      const count = accommodationStats[차수]?.[type] || 0;
                      return (
                        <td 
                          key={차수}
                          className={`border border-gray-400 px-2 py-2 text-center text-gray-900 ${count > 0 ? 'cursor-pointer hover:bg-blue-100 transition-colors' : ''}`}
                          onClick={() => handleCellClick('숙박형태', type, 차수, count)}
                        >
                          {count > 0 ? (
                            <span className="text-blue-600 font-medium underline decoration-dotted">{count}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td 
                      className={`border border-gray-400 px-2 py-2 text-center bg-blue-200 font-bold text-gray-900 ${columnTotal > 0 ? 'cursor-pointer hover:bg-blue-300 transition-colors' : ''}`}
                      onClick={() => handleCellClick('숙박형태', type, 'Total', columnTotal)}
                    >
                      {columnTotal > 0 ? (
                        <span className="text-blue-700 underline decoration-dotted">{columnTotal}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Total 행 */}
              <tr className="bg-blue-100 font-bold">
                <td className="border border-gray-400 px-2 py-2 font-bold text-gray-900 sticky left-0 bg-blue-100 z-10">Total</td>
                <td className="border border-gray-400 px-2 py-2 text-center text-gray-900">{getRowTotal('1차', accommodationStats)}</td>
                <td className="border border-gray-400 px-2 py-2 text-center text-gray-900">{getRowTotal('2차', accommodationStats)}</td>
                <td className="border border-gray-400 px-2 py-2 text-center text-gray-900">{getRowTotal('3차', accommodationStats)}</td>
                <td className="border border-gray-400 px-2 py-2 text-center text-gray-900">{getRowTotal('4차', accommodationStats)}</td>
                <td className="border border-gray-400 px-2 py-2 text-center bg-blue-200 font-bold text-gray-900">{getRowTotal('Total', accommodationStats)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
