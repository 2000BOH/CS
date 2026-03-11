import { createClient } from '@supabase/supabase-js';

// Vercel 배포를 위해 환경변수 사용
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jhnifxijxoasvkxeoipw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobmlmeGlqeG9hc3ZreGVvaXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTU0OTYsImV4cCI6MjA4NTkzMTQ5Nn0.u827lDpnFaS1vt-gFCron8cYZplDxsDy4-1rSuwWaBY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 환경변수에서 projectId 추출 (기존 코드 호환성을 위해)
export const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
export const publicAnonKey = supabaseAnonKey;

export type Database = {
  public: {
    Tables: {
      complaints: {
        Row: {
          id: string;
          차수: string;
          호실: string;
          구분: string;
          내용: string;
          조치사항: string;
          상태: string;
          등록일시: string;
          완료일시: string | null;
          연락일: string | null;
          조치일: string | null;
          처리일: string | null;
          등록자: string;
          사진: string[] | null;
          우선처리: boolean | null;
          운영종료일: string | null;
          입주일: string | null;
          청소예정일: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          차수: string;
          호실: string;
          구분: string;
          내용: string;
          조치사항: string;
          상태: string;
          등록일시: string;
          완료일시?: string | null;
          연락일?: string | null;
          조치일?: string | null;
          처리일?: string | null;
          등록자: string;
          사진?: string[] | null;
          우선처리?: boolean | null;
          운영종료일?: string | null;
          입주일?: string | null;
          청소예정일?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          차수?: string;
          호실?: string;
          구분?: string;
          내용?: string;
          조치사항?: string;
          상태?: string;
          등록일시?: string;
          완료일시?: string | null;
          연락일?: string | null;
          조치일?: string | null;
          처리일?: string | null;
          등록자?: string;
          사진?: string[] | null;
          우선처리?: boolean | null;
          운영종료일?: string | null;
          입주일?: string | null;
          청소예정일?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};