import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setSubscription(data as Subscription | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refresh: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
