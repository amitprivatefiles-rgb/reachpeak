import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';

export function PendingReview() {
  const { signOut } = useAuth();
  const { subscription } = useSubscription();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl p-10 border border-gray-200 shadow-lg">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-secondary mb-3">Account Under Review</h2>
          <p className="text-secondary-light mb-6">
            Your subscription request is being reviewed by our team. You will receive access within 24 hours.
          </p>
          {subscription && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-200">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-light">Plan</span>
                  <span className="text-secondary font-medium capitalize">{subscription.plan_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-light">Business</span>
                  <span className="text-secondary font-medium">{subscription.business_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-light">Status</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Pending</span>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-secondary-light hover:text-secondary transition text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
