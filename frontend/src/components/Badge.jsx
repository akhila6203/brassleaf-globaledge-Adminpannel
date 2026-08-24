const STATUS_COLORS = {
  'wc-processing': 'bg-blue-100 text-blue-700',
  'wc-cancelled':  'bg-gray-100 text-gray-600',
  'wc-failed':     'bg-rose-100 text-rose-700',
  'wc-completed':  'bg-emerald-100 text-emerald-700',
  'wc-on-hold':    'bg-amber-100 text-amber-700',
  'wc-refunded':   'bg-violet-100 text-violet-700',
  instock:         'bg-emerald-100 text-emerald-700',
  outofstock:      'bg-rose-100 text-rose-700',
  onbackorder:     'bg-amber-100 text-amber-700',
  '1':             'bg-emerald-100 text-emerald-700',
  '0':             'bg-rose-100 text-rose-700',
};

const LABELS = {
  'wc-processing': 'Processing',
  'wc-cancelled':  'Cancelled',
  'wc-failed':     'Failed',
  'wc-completed':  'Completed',
  'wc-on-hold':    'On Hold',
  'wc-refunded':   'Refunded',
  instock:         'In Stock',
  outofstock:      'Out of Stock',
  onbackorder:     'Backorder',
  '1':             'Success',
  '0':             'Pending',
};

export default function Badge({ value }) {
  const cls = STATUS_COLORS[value] || 'bg-gray-100 text-gray-600';
  const label = LABELS[value] || value;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
