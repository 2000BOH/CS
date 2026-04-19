import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export interface RoomData {
  차수: string;
  호수: string;
  타입: string;
  조망: string;
  운영종료일: string;
  숙박형태: string;
  임차인: string;
  임차인연락처: string;
}

interface RoomDataManagerProps {
  onRoomsUpdate?: () => void;
}

export function RoomDataManager({ onRoomsUpdate }: RoomDataManagerProps) {
  const [previewData, setPreviewData] = useState<RoomData[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 엑셀 날짜 시리얼 번호(46446 등)를 YYYY-MM-DD 형식으로 변환
  const formatExcelDate = (value: any) => {
    if (!value) return '';

    // 이미 YYYY-MM-DD 형식이거나 문자열인 경우
    if (typeof value === 'string' && value.includes('-') && value.length >= 8) {
      return value.trim();
    }

    // 숫자인 경우 (엑셀 시리얼 번호)
    if (typeof value === 'number' || (!isNaN(Number(value)) && String(value).length >= 5)) {
      const num = Number(value);
      try {
        // 엑셀 날짜 기준일(1899-12-30) 보정 로직
        // 25569는 1970년 1월 1일의 엑셀 시리얼 번호입니다.
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));

        // 유효한 날짜인지 확인
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn('날짜 변환 실패:', value);
      }
    }

    return String(value).trim();
  };

  // 엑셀 파일 업로드 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        const rooms: RoomData[] = jsonData.map((row: any) => ({
          차수: String(row['차수'] || row['차수'] || '').trim(),
          호수: String(row['호수'] || row['호실'] || '').trim(),
          타입: String(row['타입'] || row['구분'] || '').trim(),
          조망: String(row['조망'] || '').trim(),
          운영종료일: formatExcelDate(row['운영종료일'] || row['종료일'] || ''),
          숙박형태: String(row['숙박형태'] || '').trim(),
          임차인: String(row['임차인'] || '').trim(),
          임차인연락처: String(row['임차인연락처'] || row['연락처'] || '').trim(),
        }));

        setPreviewData(rooms);
        setMessage(`${rooms.length}개의 객실 데이터를 불러왔습니다.`);
        setUploadStatus('idle');
      } catch (error) {
        console.error('파일 파싱 오류:', error);
        setMessage('파일을 읽는 중 오류가 발생했습니다.');
        setUploadStatus('error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // 데이터베이스에 저장
  const handleSaveToDatabase = async () => {
    if (previewData.length === 0) {
      setMessage('저장할 데이터가 없습니다.');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('loading');
    setMessage('데이터를 저장하는 중...');

    try {

      // 1️⃣ 기존 객실정보를 가져와서 변경사항 확인
      const { data: existingRooms, error: fetchError } = await supabase
        .from('rooms')
        .select('*');

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = 데이터 없음 (정상)
        console.warn('⚠️ 기존 데이터 조회 오류:', fetchError);
      }

      // 2️⃣ 기존 데이터와 비교하여 변경 이력 저장
      const roomsToSave = previewData.map((room) => {
        const 차수정규화 = room.차수.replace('차', ''); // \"1차\" → \"1\" 변환

        // 기존 객실정보 찾기
        const existingRoom = existingRooms?.find(
          (r: any) => r.차수 === 차수정규화 && r.호수 === room.호수
        );

        // 임차인 정보가 변경되었는지 확인
        const 임차인변경됨 = existingRoom &&
          (existingRoom.임차인 !== room.임차인 ||
            existingRoom.임차인연락처 !== room.임차인연락처);

        if (임차인변경됨) {
        }

        return {
          차수: 차수정규화,
          호수: room.호수,
          타입: room.타입,
          조망: room.조망,
          운영종료일: room.운영종료일,
          숙박형태: room.숙박형태,
          임차인: room.임차인,
          임차인연락처: room.임차인연락처,
          // 임차인이 변경되었으면 이전 정보를 이력으로 저장
          이전임차인: 임차인변경됨 ? existingRoom.임차인 : (existingRoom?.이전임차인 || null),
          이전임차인연락처: 임차인변경됨 ? existingRoom.임차인연락처 : (existingRoom?.이전임차인연락처 || null),
          변경일시: 임차인변경됨 ? new Date().toISOString() : (existingRoom?.변경일시 || null),
          updated_at: new Date().toISOString(),
        };
      });

      // 3️⃣ 데이터베이스에 저장 (upsert)
      const { data, error } = await supabase
        .from('rooms')
        .upsert(roomsToSave, { onConflict: '차수,호수' })
        .select(); // 저장된 데이터 반환

      if (error) {
        console.error('❌ 저장 오류:', error);
        throw error;
      }

      // 4️⃣ 변경된 객실 수 계산
      const 변경된객실수 = roomsToSave.filter(r => r.이전임차인 && r.변경일시 === new Date().toISOString()).length;

      setUploadStatus('success');
      setMessage(
        `${previewData.length}개의 객실 데이터가 성공적으로 저장되었습니다! 🎉` +
        (변경된객실수 > 0 ? `\n📌 입주민 변경: ${변경된객실수}개 (이전 정보 보존됨)` : '')
      );

      // 5초 후 초기화
      setTimeout(() => {
        setPreviewData([]);
        setUploadStatus('idle');
        setMessage('');
      }, 5000);

      // 객실 정보 업데이트 콜백 호출
      if (onRoomsUpdate) {
        onRoomsUpdate();
      }
    } catch (error: any) {
      console.error('❌ 데이터 저장 오류 상세:', error);
      console.error('오류 코드:', error.code);
      console.error('오류 메시지:', error.message);
      console.error('오류 세부정보:', error.details);
      console.error('오류 힌트:', error.hint);

      // 테이블이 없는 경우 (PGRST205 또는 다른 관련 오류)
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' ||
        error.message?.includes('relation') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Could not find') ||
        error.message?.includes('schema cache')) {
        setMessage('❗ rooms 테이블의 컬럼이 올바르지 않거나 테이블이 없습니다. 아래 단계를 따라주세요:\n\n1. 프로젝트 파일에서 "/EXECUTE_THIS_SQL_NOW.sql" 파일 열기\n2. 전체 SQL 복사 (Ctrl+A → Ctrl+C)\n3. Supabase Dashboard → SQL Editor로 이동\n4. 붙여넣기 (Ctrl+V) 후 RUN 버튼 클릭\n5. 이 페이지로 돌아와서 다시 저장 시도');
      } else {
        setMessage(`저장 중 오류 발생: ${error.message || error.hint || JSON.stringify(error)}`);
      }
      setUploadStatus('error');
    }
  };

  // 테이블 생성 (Supabase에서 직접 실행 필요)
  const handleCreateTable = async () => {
    setUploadStatus('loading');
    setMessage('테이블을 생성하는 중...');

    try {
      // 서버 API로 테이블 생성 요청
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d90a2a9/setup-rooms-table`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
        setMessage('✅ rooms 테이블이 성공적으로 생성되었습니다! 이제 객실 데이터를 업로드할 수 있습니다.');

        setTimeout(() => {
          setUploadStatus('idle');
          setMessage('');
        }, 5000);
      } else {
        // 서버에서 테이블 생성 실패시 수동 생성 안내
        const sqlCommand = result.sql || `DROP TABLE IF EXISTS rooms CASCADE;

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  차수 TEXT NOT NULL,
  호수 TEXT NOT NULL,
  타입 TEXT,
  조망 TEXT,
  운영종료일 TEXT,
  숙박형태 TEXT,
  임차인 TEXT,
  임차인연락처 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(차수, 호수)
);

CREATE INDEX idx_rooms_차수_호수 ON rooms(차수, 호수);
CREATE INDEX idx_rooms_숙박형태 ON rooms(숙박형태);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage rooms" ON rooms FOR ALL USING (true);`;

        // SQL을 모달로 표시
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
        modal.innerHTML = `
          <div style="background:white;padding:30px;border-radius:12px;max-width:900px;max-height:90vh;overflow:auto;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
            <h2 style="margin:0 0 20px 0;color:#dc2626;font-size:24px;font-weight:bold;">🚨 자동 테이블 생성 실패</h2>
            <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:20px;margin-bottom:20px;">
              <p style="margin:0 0 10px 0;color:#991b1b;font-weight:bold;">❌ 오류 메시지:</p>
              <p style="margin:0;color:#7f1d1d;font-family:monospace;font-size:14px;">${result.error || result.hint || '알 수 없는 오류'}</p>
            </div>
            <p style="margin:0 0 15px 0;color:#374151;line-height:1.6;font-size:16px;">
              아래 SQL을 복사하여 <strong style="color:#2563eb;">Supabase Dashboard → SQL Editor</strong>에서 실행하세요:
            </p>
            <div style="position:relative;margin-bottom:20px;">
              <textarea id="sqlTextarea" readonly style="width:100%;height:400px;padding:15px;border:2px solid #e5e7eb;border-radius:8px;font-family:monospace;font-size:13px;resize:vertical;">${sqlCommand}</textarea>
              <button onclick="document.getElementById('sqlTextarea').select();document.execCommand('copy');this.textContent='✅ 복사됨!';setTimeout(()=>this.textContent='📋 SQL 복사',2000)" style="position:absolute;top:10px;right:10px;padding:8px 16px;background:#10b981;color:white;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">📋 SQL 복사</button>
            </div>
            <div style="background:#fef3c7;border:2px solid #fbbf24;border-radius:8px;padding:15px;margin-bottom:20px;">
              <p style="margin:0 0 10px 0;color:#92400e;font-weight:bold;">📋 수동 실행 방법:</p>
              <ol style="margin:0;padding-left:20px;color:#78350f;line-height:1.8;">
                <li>위 "📋 SQL 복사" 버튼 클릭</li>
                <li><a href="https://supabase.com/dashboard" target="_blank" style="color:#2563eb;font-weight:bold;text-decoration:underline;">Supabase Dashboard</a> 접속</li>
                <li>왼쪽 메뉴에서 <strong>SQL Editor</strong> 클릭</li>
                <li><strong>Ctrl+V</strong>로 붙여넣기</li>
                <li><strong style="color:#16a34a;">RUN</strong> 버튼 클릭</li>
                <li>이 페이지로 돌아와서 <strong>F5 새로고침</strong></li>
              </ol>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">닫기</button>
          </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => {
          if (e.target === modal) modal.remove();
        };

        setUploadStatus('error');
        setMessage(`테이블 생성 실패: ${result.hint || result.error}`);
      }
    } catch (error: any) {
      console.error('테이블 생성 API 호출 오류:', error);
      setUploadStatus('error');
      setMessage('서버와 통신 중 오류가 발생했습니다. 페이지를 새로고침(F5)하거나 수동으로 테이블을 생성해주세요.');
    }
  };

  // 샘플 데이터 다운로드
  const handleDownloadSample = () => {
    const sampleData = [
      {
        차수: '',
        호수: '',
        타입: '',
        조망: '',
        운영종료일: '',
        숙박형태: '',
        입차인: '',
        연락처: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '객실정보');
    XLSX.writeFile(wb, '객실정보_템플릿.xlsx');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5 text-orange-600" />
        객실정보 일괄 등록
      </h2>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800 mb-2">
          <strong>사용 방법:</strong>
        </p>
        <ol className="text-sm text-blue-700 space-y-1 ml-4 list-decimal">
          <li>엑셀 파일을 업로드하세요.</li>
          <li>엑셀 첫 번째 행의 열 이름(헤더)을 기준으로 매핑됩니다: <span className="font-mono bg-white border border-blue-200 px-1 rounded">차수, 호수(호실), 타입, 조망, 운영종료일, 숙박형태, 임차인, 임차인연락처</span></li>
          <li>미리보기로 확인 후 "데이터베이스에 저장" 버튼을 클릭하세요.</li>
        </ol>
      </div>

      {/* 기능 버튼 영역 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-5 h-5" />
          엑셀 파일 업로드
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={handleCreateTable}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          <Database className="w-4 h-4" />
          테이블 자동생성
        </button>
      </div>

      {/* 상태 메시지 */}
      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg mb-6 ${uploadStatus === 'success'
              ? 'bg-green-50 border-2 border-green-200 text-green-800'
              : uploadStatus === 'error'
                ? 'bg-red-50 border-2 border-red-200 text-red-800'
                : 'bg-yellow-50 border-2 border-yellow-200 text-yellow-800'
            }`}
        >
          {uploadStatus === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {/* 미리보기 테이블 */}
      {previewData.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">미리보기 ({previewData.length}개)</h3>
            <button
              onClick={handleSaveToDatabase}
              disabled={uploadStatus === 'loading'}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 font-medium"
            >
              {uploadStatus === 'loading' ? '저장 중...' : '✓ 데이터베이스에 저장'}
            </button>
          </div>

          <div className="overflow-x-auto border-2 border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">차수</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">호수</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">타입</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">조망</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">운영종료일</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">숙박형태</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">임차인</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">임차인연락처</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 50).map((room, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900">{room.차수}</td>
                    <td className="px-3 py-2 text-gray-900">{room.호수}</td>
                    <td className="px-3 py-2 text-gray-900">{room.타입}</td>
                    <td className="px-3 py-2 text-gray-900">{room.조망}</td>
                    <td className="px-3 py-2 text-gray-900">{room.운영종료일}</td>
                    <td className="px-3 py-2 text-gray-900">{room.숙박형태}</td>
                    <td className="px-3 py-2 text-gray-900">{room.임차인}</td>
                    <td className="px-3 py-2 text-gray-900">{room.임차인연락처}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 50 && (
              <div className="text-center py-2 bg-gray-50 text-sm text-gray-600">
                ... 외 {previewData.length - 50}개 (전체 데이터가 저장됩니다)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}