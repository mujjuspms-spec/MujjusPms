import { getToken } from './api';

export function reportsExportUrl() {
  const token = getToken();
  return `/api/reports/export?token=${encodeURIComponent(token || '')}`;
}
