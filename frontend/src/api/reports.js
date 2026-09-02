import client, { getToken } from './client';

export const getReports = (params) => client.get('/reports', { params });
export const getReportSummary = (params) => client.get('/reports/summary', { params });
export const getReportSchedule = () => client.get('/reports/schedule');
export const saveReportSchedule = (data) => client.put('/reports/schedule', data);

function buildParams({ type, customerIds = [], orderIds = [], range, date, dateFrom, dateTo }) {
  const params = new URLSearchParams();
  params.set('type', type);
  if (orderIds.length) {
    params.set('order_ids', orderIds.join(','));
  } else {
    if (customerIds.length) params.set('customer_ids', customerIds.join(','));
    if (range) params.set('range', range);
    if (date) params.set('date', date);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
  }
  return params;
}
export async function downloadReports(opts) {
  const params = buildParams(opts);

  const base =
    import.meta.env.VITE_API_URL ||
    '/api';

  const token = getToken();

  const url =
    `${base}/reports/download?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',

    headers: token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {},
  });

  if (!res.ok) {
    let message = 'Download failed';

    try {
      const data = await res.json();

      message =
        data.message ||
        data.error ||
        message;
    } catch {
      // response wasn't JSON
    }

    throw new Error(message);
  }

  const contentType =
    res.headers.get('Content-Type') ||
    '';

  const buffer =
    await res.arrayBuffer();

  const bytes =
    new Uint8Array(buffer);

  const isPdf =
    contentType.includes(
      'application/pdf'
    ) ||
    (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    );

  if (!isPdf) {
    let message =
      'Server did not return a valid PDF';

    try {
      const text =
        new TextDecoder().decode(
          bytes.slice(0, 1000)
        );

      const parsed =
        JSON.parse(text);

      message =
        parsed.message ||
        parsed.error ||
        message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const blob =
    new Blob(
      [buffer],
      {
        type: 'application/pdf',
      }
    );

  const disposition =
    res.headers.get(
      'Content-Disposition'
    ) || '';

  const match =
    disposition.match(
      /filename="?([^"]+)"?/i
    );

  const filename =
    match?.[1] ||
    `${opts.type}-${Date.now()}.pdf`;

  const objectUrl =
    URL.createObjectURL(blob);

  const link =
    document.createElement('a');

  link.href = objectUrl;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(
    objectUrl
  );
}

// export function downloadReports(opts) {
//   const params = buildParams(opts);
//   const base = import.meta.env.VITE_API_URL || '/api';
//   const token = getToken();
//   const url = `${base}/reports/download?${params.toString()}`;

//   return fetch(url, {
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   }).then(async (res) => {
//     const contentType = res.headers.get('Content-Type') || '';

//     if (!res.ok) {
//       let message = 'Download failed';
//       try {
//         const data = await res.json();
//         message = data.message || data.error || message;
//       } catch {
//         /* ignore */
//       }
//       throw new Error(message);
//     }

//     const buffer = await res.arrayBuffer();
//     const bytes = new Uint8Array(buffer);

//     const isZip =
//       contentType.includes('zip') ||
//       (bytes[0] === 0x50 && bytes[1] === 0x4b);
//     const isPdf =
//       contentType.includes('pdf') ||
//       (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);

//     if (!isPdf && !isZip) {
//       let message = 'Download failed — server did not return a valid PDF';
//       try {
//         const text = new TextDecoder().decode(bytes.slice(0, 500));
//         const parsed = JSON.parse(text);
//         message = parsed.message || parsed.error || message;
//       } catch {
//         /* ignore */
//       }
//       throw new Error(message);
//     }

//     const blob = new Blob([buffer], {
//       type: isZip ? 'application/zip' : 'application/pdf',
//     });

//     const disposition = res.headers.get('Content-Disposition') || '';
//     const match = disposition.match(/filename="?([^"]+)"?/i);
//     const defaultExt = isZip ? 'zip' : 'pdf';
//     const filename = match?.[1] || `${opts.type}-${Date.now()}.${defaultExt}`;
//     const objectUrl = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = objectUrl;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//     URL.revokeObjectURL(objectUrl);
//   });
// }



// import client, { getToken } from './client';

// export const getReports = (params) => client.get('/reports', { params });
// export const getReportSummary = (params) => client.get('/reports/summary', { params });
// export const getReportSchedule = () => client.get('/reports/schedule');
// export const saveReportSchedule = (data) => client.put('/reports/schedule', data);

// function buildParams({ type, customerIds = [], orderIds = [], range, date, dateFrom, dateTo }) {
//   const params = new URLSearchParams();
//   params.set('type', type);
//   if (orderIds.length) {
//     params.set('order_ids', orderIds.join(','));
//   } else {
//     if (customerIds.length) params.set('customer_ids', customerIds.join(','));
//     if (range) params.set('range', range);
//     if (date) params.set('date', date);
//     if (dateFrom) params.set('date_from', dateFrom);
//     if (dateTo) params.set('date_to', dateTo);
//   }
//   return params;
// }

// export function downloadReports(opts) {
//   const params = buildParams(opts);
//   const base = import.meta.env.VITE_API_URL || '/api';
//   const token = getToken();
//   const url = `${base}/reports/download?${params.toString()}`;

//   return fetch(url, {
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//   }).then(async (res) => {
//     const contentType = res.headers.get('Content-Type') || '';

//     if (!res.ok) {
//       let message = 'Download failed';
//       try {
//         const data = await res.json();
//         message = data.message || data.error || message;
//       } catch {
//         /* ignore */
//       }
//       throw new Error(message);
//     }

//     const buffer = await res.arrayBuffer();
//     const bytes = new Uint8Array(buffer);

//     const isZip =
//       contentType.includes('zip') ||
//       (bytes[0] === 0x50 && bytes[1] === 0x4b);
//     const isPdf =
//       contentType.includes('pdf') ||
//       (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);

//     if (!isPdf && !isZip) {
//       let message = 'Download failed — server did not return a valid PDF';
//       try {
//         const text = new TextDecoder().decode(bytes.slice(0, 500));
//         const parsed = JSON.parse(text);
//         message = parsed.message || parsed.error || message;
//       } catch {
//         /* ignore */
//       }
//       throw new Error(message);
//     }

//     const blob = new Blob([buffer], {
//       type: isZip ? 'application/zip' : 'application/pdf',
//     });

//     const disposition = res.headers.get('Content-Disposition') || '';
//     const match = disposition.match(/filename="?([^"]+)"?/i);
//     const defaultExt = isZip ? 'zip' : 'pdf';
//     const filename = match?.[1] || `${opts.type}-${Date.now()}.${defaultExt}`;
//     const objectUrl = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = objectUrl;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
//     URL.revokeObjectURL(objectUrl);
//   });
// }
