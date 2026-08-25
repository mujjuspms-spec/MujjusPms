import { apiFetch } from './api';

export function fetchNotifications() {
  return apiFetch('/api/notifications').then((r) => r.notifications);
}

export function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).then((r) => r.notification);
}
