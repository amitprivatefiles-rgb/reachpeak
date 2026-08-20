import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Self-hosted ReachPeak API (public values — the anon key ships in the browser by design).
// Env vars take precedence; these defaults guarantee the app works even if Vercel env is misconfigured.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://api.reachpeakapi.in';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg3MjIwMjU3LCJleHAiOjIxMDI1ODAyNTd9.hIa3jRN_znoL8GC76Qn8qSreFXWluJYY25Pvcs7Ta_I';

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
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');
