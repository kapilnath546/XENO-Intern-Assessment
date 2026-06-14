// SegmentCustomerModal.tsx — Slide-over modal showing the list of customers in a segment.
// Lets the marketer verify exactly who will receive a campaign before launching it.

import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { SegmentCustomer } from '../types';
import { formatCurrency } from '../utils';

interface SegmentCustomerModalProps {
  segmentName: string;
  customers: SegmentCustomer[];
  loading: boolean;
  onClose: () => void;
}

export function SegmentCustomerModal({
  segmentName,
  customers,
  loading,
  onClose,
}: SegmentCustomerModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const safeCustomers = Array.isArray(customers) ? customers : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{segmentName}</h2>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading customers…' : `${safeCustomers.length} customers in segment`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
            </div>
          ) : safeCustomers.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No customers in this segment.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">City</th>
                  <th className="pb-3 pr-4 text-right">Spend</th>
                  <th className="pb-3 text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {safeCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900">{customer.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{customer.email}</td>
                    <td className="py-3 pr-4 text-gray-600">{customer.city}</td>
                    <td className="py-3 pr-4 text-right font-medium text-gray-900">
                      {formatCurrency(customer.total_spend)}
                    </td>
                    <td className="py-3 text-right text-gray-600">{customer.order_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
