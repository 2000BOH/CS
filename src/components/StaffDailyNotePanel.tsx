import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FileText, Save, Battery, Smile, Meh, Frown, BatteryLow, BatteryFull } from 'lucide-react';
import { supabase } from '../utils/supabase/client';

const MOOD_OPTIONS = [
  { key: '최고', Icon: BatteryFull, color: 'text-green-500' },
  { key: '좋음', Icon: Smile, color: 'text-blue-500' },
  { key: '보통', Icon: Meh, color: 'text-yellow-500' },
  { key: '지침', Icon: BatteryLow, color: 'text-orange-500' },
  { key: '힘듦', Icon: Frown, color: 'text-red-500' },
] as const;
const DIFFICULTY_OPTIONS = ['매우 여유', '여유로움', '다소 여유', '적당함', '다소 바쁨', '바쁨', '매우 바쁨', '힘듦', '매우 힘듦'] as const;

const CONDITION_PREFIX = '[컨디션]';
function parseConditionLine(text: string): { mood: string; difficulty: string; rest: string } {
  const mood = '좋음';
  const difficulty = '적당함';
  if (!text.startsWith(CONDITION_PREFIX)) return { mood, difficulty, rest: text };
  const end = text.indexOf('\n\n');
  const firstLine = end === -1 ? text : text.slice(0, end);
  const rest = end === -1 ? '' : text.slice(end + 2);
  const m = firstLine.match(/기분:\s*([^,]+)/);
  const d = firstLine.match(/난이도:\s*(.+)$/);
  return {
    mood: m ? m[1].trim() : mood,
    difficulty: d ? d[1].trim() : difficulty,
    rest,
  };
}
function buildConditionLine(mood: string, difficulty: string): string {
  return `${CONDITION_PREFIX} 기분: ${mood}, 난이도: ${difficulty}`;
}

export interface StaffDailyNote {
  id?: string;
  staff_id: string;
  note_date: string;
  중요사항: string;
  특이사항: string;
  updated_at?: string;
}

interface StaffDailyNotePanelProps {
  staffId: '02' | '03' | '04';
  staffName: string;
  noteDate?: string;
}

export function StaffDailyNotePanel({ staffId, staffName, noteDate: propNoteDate }: StaffDailyNotePanelProps) {
  const noteDate = propNoteDate || format(new Date(), 'yyyy-MM-dd');
  const [중요사항, set중요사항] = useState('');
  const [특이사항, set특이사항] = useState('');
  const [mood, setMood] = useState<string>('좋음');
  const [difficulty, setDifficulty] = useState<string>('적당함');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('staff_daily_notes')
        .select('*')
        .eq('staff_id', staffId)
        .eq('note_date', noteDate)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          set중요사항('');
          set특이사항('');
          return;
        }
        set중요사항('');
        set특이사항('');
        return;
      }
      if (data) {
        const raw = (data as StaffDailyNote).중요사항 || '';
        const parsed = parseConditionLine(raw);
        setMood(parsed.mood);
        setDifficulty(parsed.difficulty);
        set중요사항(parsed.rest);
        set특이사항((data as StaffDailyNote).특이사항 || '');
      } else {
        set중요사항('');
        set특이사항('');
      }
    })();
    return () => { cancelled = true; };
  }, [staffId, noteDate]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    const conditionLine = buildConditionLine(mood, difficulty);
    const 중요사항ToSave = 중요사항.trim() ? `${conditionLine}\n\n${중요사항.trim()}` : conditionLine;
    const { error } = await supabase
      .from('staff_daily_notes')
      .upsert(
        {
          staff_id: staffId,
          note_date: noteDate,
          중요사항: 중요사항ToSave,
          특이사항: 특이사항.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'staff_id,note_date' }
      );
    setSaving(false);
    if (error) {
      setSaveMessage('error');
      return;
    }
    setSaveMessage('success');
    setTimeout(() => setSaveMessage(null), 2000);
  };

  return (
    <div className="flex-shrink-0 bg-white rounded-lg shadow-md border border-gray-200 p-4 flex flex-col h-fit"
      style={{ width: '520px' }}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <FileText className="w-5 h-5 text-blue-600" />
        <span className="font-bold text-gray-800 text-sm">오늘의 메모</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {format(new Date(noteDate), 'yyyy년 M월 d일 (E)', { locale: ko })}
      </p>
      <div className="space-y-3 flex-1">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">중요사항</label>
          <textarea
            value={중요사항}
            onChange={(e) => set중요사항(e.target.value)}
            placeholder="오늘 중요하게 처리한 사항을 적어 주세요."
            rows={3}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">특이사항</label>
          <textarea
            value={특이사항}
            onChange={(e) => set특이사항(e.target.value)}
            placeholder="특이 사항, 업무일지 참고 메모 등"
            rows={3}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        {/* 오늘의 컨디션 */}
        <div className="pb-6 border-t border-gray-200" style={{ paddingTop: '20px' }}>
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <Battery className="w-4 h-4 text-green-500" /> 오늘의 컨디션
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">현재 나의 상태</p>
              <div className="flex justify-between gap-1">
                {MOOD_OPTIONS.map(({ key, Icon, color }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMood(key)}
                    className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${
                      mood === key ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-0.5 ${color}`} />
                    <span className="text-[10px] font-medium text-gray-600">{key}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">업무 난이도</p>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      difficulty === d ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: '40px' }}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? '저장 중...' : '저장'}
      </button>
      {saveMessage === 'success' && (
        <p className="mt-2 text-xs text-green-600 text-center">저장되었습니다.</p>
      )}
      {saveMessage === 'error' && (
        <p className="mt-2 text-xs text-red-600 text-center">저장 실패. 네트워크를 확인해 주세요.</p>
      )}
    </div>
  );
}
