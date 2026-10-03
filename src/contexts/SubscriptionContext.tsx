import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'monthly' | 'yearly';
  amount: number;
  payment_reference: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  rejection_reason: string | null;
  business_name: string;
  business_type: string;
  whatsapp_number: string;
  website_url: string | null;
  logo_url: string | null;
  business_address: string | null;
  contact_person: string;
  approved_by: string | null;
  approved_at: string | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = user?.id ?? null;
  const uidRef = useRef<string | null>(uid);
  uidRef.current = uid;
  // Which user the current subscription value belongs to (undefined = not resolved yet).
  const [resolvedFor, setResolvedFor] = useState<string | null | undefined>(undefined);

  const fetchSubscription = async (retryCount = 0) => {
    const id = uidRef.current;
    if (!id) {
      setSubscription(null);
      setResolvedFor(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data && retryCount < 2) {
      // Retry after a short delay — subscription might not be committed yet
      retryTimeoutRef.current = setTimeout(() => fetchSubscription(retryCount + 1), 1500);
      return;
    }

    if (uidRef.current !== id) return; // user changed while this request was in flight
    setSubscription(data as Subscription | null);
    setResolvedFor(id);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [uid]);

  const effectiveLoading = loading || (uid !== null && resolvedFor !== uid);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading: effectiveLoading, refresh: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
