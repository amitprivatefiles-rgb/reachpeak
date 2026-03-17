import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Show visible error instead of silently crashing
  document.getElementById('root')!.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-family:sans-serif;text-align:center;padding:20px;">
      <div>
        <h1 style="font-size:24px;margin-bottom:8px;">⚠️ Configuration Error</h1>
        <p style="color:#94a3b8;">Missing Supabase environment variables. Please check your Vercel environment settings.</p>
        <p style="color:#64748b;font-size:12px;margin-top:16px;">Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY</p>
      </div>
    </div>`;
}

export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');
