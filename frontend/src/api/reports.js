import client, { getToken } from './client';

export const getReports = (params) => client.get('/reports', { params });
export const getReportSummary = (params) => client.get('/reports/summary', { params });

function buildParams({ type, customerIds = [], orderIds = [], range, date, dateFrom, dateTo }) {
  const params = new URLSearchParams();
  params.set('type', type);
  if (customerIds.length) params.set('customer_ids', customerIds.join(','));
  if (orderIds.length) params.set('order_ids', orderIds.join(','));
  if (range) params.set('range', range);
  if (date) params.set('date', date);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  return params;
}

export function downloadReports(opts) {
  const params = buildParams(opts);
  const base = import.meta.env.VITE_API_URL || '/api';
  const token = getToken();
  const url = `${base}/reports/download?${params.toString()}`;

  return fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    if (!res.ok) {
      let message = 'Download failed';
      try {
        const data = await res.json();
        message = data.message || data.error || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `${opts.type}-${Date.now()}.pdf`;
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  });
}

export const emailCustomerInvoices = (data) => client.post('/reports/email/customer', data);
export const emailDailyReports = (data) => client.post('/reports/email/daily', data);
