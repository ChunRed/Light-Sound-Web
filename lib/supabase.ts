// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const aiSupabaseUrl = process.env.NEXT_PUBLIC_AI_SUPABASE_URL || '';
const aiSupabaseAnonKey = process.env.NEXT_PUBLIC_AI_SUPABASE_ANON_KEY || '';

// 避免在編譯建置期 (Build Time) 因為未設定環境變數而導致 Vercel 編譯失敗
export const aiSupabase = createClient(
  aiSupabaseUrl || 'https://placeholder-project.supabase.co',
  aiSupabaseAnonKey || 'placeholder-key'
);