// Web Push subscription helper (frontend). The VAPID public key is safe to embed.
import { supabase } from './supabase';

const VAPID_PUBLIC = 'BI-vNJ78tRTaFu34mhKrCisEGZCJlioD2wMmxmgs_iyi4NEH5qT9YWO4RMLcDotiaCo3b4aq56ONJ539ih9XW6Y';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export async function isPushEnabled(): Promise<boolean> {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch { return false; }
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!pushSupported()) return { ok: false, error: 'Notifications are not supported on this device/browser.' };
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, error: 'Notification permission was not granted.' };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Please sign in first.' };

    const j: any = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: j.endpoint,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth,
      user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' });
    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not enable notifications.' };
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => {});
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  } catch { /* ignore */ }
}
