export const ORDER_STATUSES = [
  { value: 'wc-pending', label: 'Pending' },
  { value: 'wc-processing', label: 'Processing' },
  { value: 'wc-on-hold', label: 'On Hold' },
  { value: 'wc-completed', label: 'Completed' },
  { value: 'wc-cancelled', label: 'Cancelled' },
  { value: 'wc-refunded', label: 'Refunded' },
  { value: 'wc-failed', label: 'Failed' },
];

export const STATUS_META = {
  'wc-processing': { label: 'Processing', color: 'info' },
  'wc-cancelled': { label: 'Cancelled', color: 'default' },
  'wc-failed': { label: 'Failed', color: 'error' },
  'wc-completed': { label: 'Completed', color: 'success' },
  'wc-on-hold': { label: 'On Hold', color: 'warning' },
  'wc-refunded': { label: 'Refunded', color: 'secondary' },
  'wc-pending': { label: 'Pending', color: 'warning' },
  instock: { label: 'In Stock', color: 'success' },
  outofstock: { label: 'Out of Stock', color: 'error' },
  onbackorder: { label: 'Backorder', color: 'warning' },
  '1': { label: 'Success', color: 'success' },
  '0': { label: 'Pending', color: 'warning' },
  publish: { label: 'Published', color: 'success' },
  draft: { label: 'Draft', color: 'default' },
  active: { label: 'Active', color: 'success' },
  inactive: { label: 'Inactive', color: 'default' },
};

export function statusLabel(value) {
  return STATUS_META[value]?.label || String(value || '—').replace(/^wc-/, '');
}

export function statusColor(value) {
  return STATUS_META[value]?.color || 'default';
}
