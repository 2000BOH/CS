import { Phone, Key, Building2, Tv, Upload, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { RoomDataManager } from './RoomDataManager';
import { useState, useRef } from 'react';
import { supabase } from '../utils/supabase/client';
import * as XLSX from 'xlsx';

interface InfoPageProps {
  onRoomsUpdate?: () => void;
  currentUserId?: string;
}

export function InfoPage({ onRoomsUpdate, currentUserId }: InfoPageProps) {
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 엑셀 날짜 포맷 변환 (숫자 시리얼 번호 등)
  const formatExcelDate = (value: any) => {
    if (!value) return '';
    if (typeof value === 'string' && value.includes('-') && value.length >= 8) return value.trim();

    if (typeof value === 'number' || (!isNaN(Number(value)) && String(value).length >= 5)) {
      const num = Number(value);
      try {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
      } catch (e) {
        console.warn('날짜 변환 실패:', value);
      }
    }
    return String(value).trim();
  };

  // 엑셀 파일 업로드 및 파싱
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('idle');
    setImportMessage('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // 첫 번째 행을 헤더(key)로 하여 데이터 매핑
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        const rows = jsonData.map((row: any, idx: number) => ({
          rowNum: idx + 2,
          날짜: formatExcelDate(row['날짜'] || row['일자'] || row['등록일'] || ''),
          차수: String(row['차수'] || '').trim(),
          호실: String(row['호실'] || row['호수'] || '').trim(),
          구분: String(row['구분'] || '').trim(),
          내용: String(row['내용'] || '').trim(),
        })).filter((r: any) => r.차수 && r.호실 && r.내용);

        if (rows.length === 0) {
          setImportStatus('error');
          setImportMessage('유효한 데이터가 없습니다. 첫 행에 날짜, 차수, 호실, 구분, 내용 등의 열 이름이 있는지 확인해주세요.');
          setParsedData([]);
        } else {
          setParsedData(rows);
          setImportMessage(`${rows.length}건의 데이터를 불러왔습니다. 확인 후 등록해주세요.`);
        }
      } catch (err: any) {
        setImportStatus('error');
        setImportMessage('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsBinaryString(file);

    // 파일 선택 초기화
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      setImportStatus('error');
      setImportMessage('입력된 데이터가 없습니다.');
      return;
    }

    setIsImporting(true);
    setImportStatus('idle');

    try {
      const records = parsedData.map(row => ({
        id: `import-${Date.now()}-${row.rowNum}-${Math.random().toString(36).slice(2, 7)}`,
        차수: row.차수,
        호실: row.호실,
        구분: row.구분 || '민원(기타)',
        내용: row.내용,
        조치사항: '',
        상태: '완료' as const,
        등록일시: (() => {
          if (!row.날짜) return new Date().toISOString();
          const d = new Date(row.날짜);
          return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        })(),
        등록자: currentUserId || '01',
      }));

      const chunkSize = 50;
      let successCount = 0;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error } = await supabase.from('complaints').insert(chunk);
        if (error) throw error;
        successCount += chunk.length;
      }

      setImportStatus('success');
      setImportMessage(`${successCount}건의 과거 데이터가 등록되었습니다.`);
      setParsedData([]);
    } catch (err: any) {
      setImportStatus('error');
      setImportMessage(`오류: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const manageInfo = [
    { label: '1차 관리사무소', number: '032-747-0911', building: '1차', color: 'blue' },
    { label: '2차 관리사무소', number: '032-752-9962', building: '2차', color: 'purple' },
    { label: '3차 관리사무소', number: '032-231-8002', building: '3차', color: 'indigo' },
    { label: '4차 관리사무소', number: '032-751-7334', building: '4차', color: 'cyan' },
  ];

  const safetyInfo = [
    { label: '1차 방재실', number: '070-4418-0914', building: '1차', color: 'blue' },
    { label: '2차 방재실', number: '032-752-9969', building: '2차', color: 'purple' },
    { label: '3차 방재실', number: '032-231-8004', building: '3차', color: 'indigo' },
    { label: '4차 방재실', number: '032-751-4561', building: '4차', color: 'cyan' },
  ];

  const serviceInfo = [
    { label: 'AS / 스카이라이프', detail: '1,2,4차', number: '1588-3002', icon: Tv },
    { label: 'KT', detail: '3차', number: '100', icon: Phone },
    { label: 'LG', detail: '1,2차', number: '1544-7777', icon: Phone },
    { label: '삼성', detail: '3,4차', number: '1588-3366', icon: Phone },
  ];

  const passwordInfo = [
    { label: '퇴실 및 퇴실점검 후', password: '2026' },
    { label: '청소 및 입실점검 후', password: '차수+객실번호' },
  ];

  const handleCall = (number: string) => {
    // 숫자만 추출 (*, # 포함)
    const cleanNumber = number.replace(/[^\d*#]/g, '');
    window.location.href = `tel:${cleanNumber}`;
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { border: string; bg: string; hover: string; iconBg: string; iconText: string; text: string }> = {
      blue: { border: 'border-blue-200', bg: 'bg-blue-50', hover: 'hover:bg-blue-100', iconBg: 'bg-blue-200', iconText: 'text-blue-700', text: 'text-blue-700' },
      purple: { border: 'border-purple-200', bg: 'bg-purple-50', hover: 'hover:bg-purple-100', iconBg: 'bg-purple-200', iconText: 'text-purple-700', text: 'text-purple-700' },
      indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100', iconBg: 'bg-indigo-200', iconText: 'text-indigo-700', text: 'text-indigo-700' },
      cyan: { border: 'border-cyan-200', bg: 'bg-cyan-50', hover: 'hover:bg-cyan-100', iconBg: 'bg-cyan-200', iconText: 'text-cyan-700', text: 'text-cyan-700' },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      {/* 타이틀 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8" />
          <h1 className="text-2xl font-bold">연락처 안내</h1>
        </div>
        <p className="text-blue-100 text-sm">블루오션 레지던스 호텔 주요 연락처 정보</p>
      </div>

      {/* 관리/방재 연락처 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-600" />
          관리실 · 방재실 연락처
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {manageInfo.map((contact, idx) => {
            const colors = getColorClasses(contact.color);
            return (
              <button
                key={idx}
                onClick={() => handleCall(contact.number)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:shadow-md active:scale-95 ${colors.border} ${colors.bg} ${colors.hover}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.iconBg}`}>
                    <Phone className={`w-4 h-4 ${colors.iconText}`} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-gray-900">{contact.label}</div>
                    <div className={`text-xs font-medium ${colors.text}`}>
                      {contact.number}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {safetyInfo.map((contact, idx) => {
            const colors = getColorClasses(contact.color);
            return (
              <button
                key={idx}
                onClick={() => handleCall(contact.number)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:shadow-md active:scale-95 ${colors.border} ${colors.bg} ${colors.hover}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.iconBg}`}>
                    <Phone className={`w-4 h-4 ${colors.iconText}`} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-gray-900">{contact.label}</div>
                    <div className={`text-xs font-medium ${colors.text}`}>
                      {contact.number}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 케이블TV/통신 서비스 정보 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tv className="w-5 h-5 text-purple-600" />
          케이블TV · 통신 서비스
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {serviceInfo.map((service, idx) => {
            const Icon = service.icon;
            return (
              <button
                key={idx}
                onClick={() => handleCall(service.number)}
                className="flex items-center justify-between p-3 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all hover:shadow-md active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-purple-700" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-gray-900">{service.label}</div>
                    <div className="text-xs font-medium text-purple-700">{service.number}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 객실 비밀번호 정보 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-green-600" />
          객실 비밀번호
        </h2>
        <div className="space-y-3">
          {passwordInfo.map((info, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 rounded-lg border-2 border-green-200 bg-green-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                  <Key className="w-5 h-5 text-green-700" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-gray-900">{info.label}</div>
                </div>
              </div>
              <div className="text-xl font-bold text-green-700">
                {info.password}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 관리자 도구 (과거 민원 등록 + 객실 정보 등록 좌우 배치) */}
      {currentUserId === '01' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* 왼쪽: 과거 민원 일괄 입력 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              과거 하자/민원 데이터 일괄 입력
            </h2>

            <div className="space-y-4 flex-1">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-bold text-blue-900 mb-2">엑셀 파일 업로드</p>
                    <p className="mb-1">엑셀 첫 번째 행의 열 이름(헤더)을 기준으로 데이터가 자동 매핑됩니다.</p>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {['날짜', '차수', '호실', '구분', '내용'].map((col) => (
                        <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-blue-800 rounded text-xs font-medium">
                          {col}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-gray-500 text-xs">구분 예시: 민원(영선), 민원(기타), 입실, 퇴실, 청소 — 생략 시 "민원(기타)"로 자동 입력됨</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">엑셀 파일 선택</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                </div>
              </div>

              {parsedData.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">미리보기 (처음 5행)</p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {['날짜', '차수', '호실', '구분', '내용'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-1.5 text-gray-700">{row.날짜}</td>
                            <td className="px-3 py-1.5 text-gray-700">{row.차수}</td>
                            <td className="px-3 py-1.5 text-gray-700">{row.호실}</td>
                            <td className="px-3 py-1.5 text-gray-700">{row.구분 || <span className="text-gray-400">민원(기타)</span>}</td>
                            <td className="px-3 py-1.5 text-gray-700 max-w-[150px] truncate">{row.내용}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 5 && (
                    <p className="text-xs text-gray-500 mt-1">... 외 {parsedData.length - 5}건 더 있음 (총 {parsedData.length}건)</p>
                  )}
                </div>
              )}

              {importMessage && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${importStatus === 'success' ? 'bg-green-50 border-2 border-green-200 text-green-800' :
                    importStatus === 'error' ? 'bg-red-50 border-2 border-red-200 text-red-800' :
                      'bg-blue-50 border-2 border-blue-200 text-blue-800'
                  }`}>
                  {importStatus === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                  <span className="font-medium text-sm">{importMessage}</span>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={isImporting || parsedData.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                <Database className="w-5 h-5" />
                {isImporting ? '등록 중...' : `과거 데이터 등록${parsedData.length > 0 ? ` (총 ${parsedData.length}건)` : ''}`}
              </button>
            </div>
          </div>

          {/* 오른쪽: 객실정보 일괄 등록 */}
          <RoomDataManager onRoomsUpdate={onRoomsUpdate} />
        </div>
      )}
    </div>
  );
}