// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const aiSupabaseUrl = process.env.NEXT_PUBLIC_AI_SUPABASE_URL!;
const aiSupabaseAnonKey = process.env.NEXT_PUBLIC_AI_SUPABASE_ANON_KEY!;

export const aiSupabase = createClient(aiSupabaseUrl, aiSupabaseAnonKey);