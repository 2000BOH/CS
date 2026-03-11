import { Phone, Key, Building2, Tv, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { RoomDataManager } from './RoomDataManager';
import { useState } from 'react';
import { supabase } from '../utils/supabase/client';

interface InfoPageProps {
  onRoomsUpdate?: () => void;
  currentUserId?: string;
}

export function InfoPage({ onRoomsUpdate, currentUserId }: InfoPageProps) {
  const [pasteText, setPasteText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);

  // 붙여넣기 텍스트 파싱 (탭/쉼표/엑셀 형식 모두 지원)
  const parseImportText = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];

    return lines.map((line, idx) => {
      // 탭 구분 또는 쉼표 구분
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      const clean = cols.map(c => c.trim().replace(/^["']|["']$/g, ''));
      return {
        rowNum: idx + 1,
        날짜: clean[0] || '',
        차수: clean[1] || '',
        호실: clean[2] || '',
        구분: clean[3] || '',
        내용: clean[4] || '',
      };
    });
  };

  const handleTextChange = (text: string) => {
    setPasteText(text);
    setImportStatus('idle');
    const rows = parseImportText(text);
    setPreviewRows(rows.slice(0, 5));
  };

  const handleImport = async () => {
    const rows = parseImportText(pasteText);
    if (rows.length === 0) {
      setImportStatus('error');
      setImportMessage('입력된 데이터가 없습니다.');
      return;
    }

    setIsImporting(true);
    setImportStatus('idle');

    try {
      const records = rows.map(row => ({
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
      setPasteText('');
      setPreviewRows([]);
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

      {/* 과거 하자/민원 데이터 일괄 입력 */}
      {currentUserId === '01' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            과거 하자/민원 데이터 일괄 입력
          </h2>

          <div className="space-y-4">
            {/* 안내 */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-bold text-blue-900 mb-2">엑셀에서 복사하여 붙여넣기</p>
                  <p className="mb-1">엑셀에서 아래 순서로 열을 맞춰 복사 후 붙여넣기 하세요.</p>
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {['날짜', '차수', '호실', '구분', '내용'].map((col, i) => (
                      <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        <span className="text-blue-400">{i + 1}열</span> {col}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-gray-500 text-xs">구분 예시: 민원(영선), 민원(기타), 입실, 퇴실, 청소 — 생략 시 "민원(기타)"로 자동 입력됩니다.</p>
                </div>
              </div>
            </div>

            {/* 붙여넣기 영역 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">데이터 붙여넣기</label>
              <textarea
                value={pasteText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={"2024-01-15\t1\t101\t민원(영선)\t화장실 배수 불량\n2024-01-16\t2\t205\t민원(기타)\t소음 민원"}
                rows={8}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">탭(Tab) 또는 쉼표(,)로 구분된 데이터를 붙여넣으세요.</p>
            </div>

            {/* 미리보기 */}
            {previewRows.length > 0 && (
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
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-1.5 text-gray-700">{row.날짜}</td>
                          <td className="px-3 py-1.5 text-gray-700">{row.차수}</td>
                          <td className="px-3 py-1.5 text-gray-700">{row.호실}</td>
                          <td className="px-3 py-1.5 text-gray-700">{row.구분 || <span className="text-gray-400">민원(기타)</span>}</td>
                          <td className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate">{row.내용}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parseImportText(pasteText).length > 5 && (
                  <p className="text-xs text-gray-500 mt-1">... 외 {parseImportText(pasteText).length - 5}건 더 있음 (총 {parseImportText(pasteText).length}건)</p>
                )}
              </div>
            )}

            {/* 등록 버튼 */}
            <button
              onClick={handleImport}
              disabled={isImporting || !pasteText.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {isImporting ? '등록 중...' : `과거 데이터 등록${previewRows.length > 0 ? ` (총 ${parseImportText(pasteText).length}건)` : ''}`}
            </button>

            {/* 결과 메시지 */}
            {importStatus === 'success' && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{importMessage}</span>
              </div>
            )}
            {importStatus === 'error' && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{importMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 객실정보 일괄 등록 */}
      {currentUserId === '01' && (
        <RoomDataManager onRoomsUpdate={onRoomsUpdate} />
      )}
    </div>
  );
}