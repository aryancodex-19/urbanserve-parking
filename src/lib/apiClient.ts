import type {
  FacilitiesDataMap,
  Booking,
  BookingStatus,
  Issue,
  IssueStatus,
  UsageRecord,
  Activity,
  AppNotification,
  SlotStatus,
} from '../types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`API Error [${res.status}] ${endpoint}: ${errorText}`);
  }

  return res.json();
}

export const apiClient = {
  // Facilities & Slots
  getFacilitiesData: () => request<FacilitiesDataMap>('/slots'),

  updateSlotStatus: (facilityId: string, slotId: string, status: SlotStatus) =>
    request<{ success: boolean }>('/slots', {
      method: 'PATCH',
      body: JSON.stringify({ facilityId, slotId, status }),
    }),

  // Bookings
  getBookings: () => request<Booking[]>('/bookings'),

  createBooking: (booking: Booking) =>
    request<{ success: boolean }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    }),

  updateBookingStatus: (
    id: string,
    status: BookingStatus,
    slotId?: string,
    facilityId?: string
  ) =>
    request<{ success: boolean }>('/bookings', {
      method: 'PATCH',
      body: JSON.stringify({
        id,
        status,
        slotId,
        facilityId,
        updatedAt: new Date().toISOString(),
      }),
    }),

  operatorBookSlot: (booking: Booking) =>
    request<{ success: boolean }>('/override', {
      method: 'POST',
      body: JSON.stringify(booking),
    }),

  // Issues
  getIssues: () => request<Issue[]>('/issues'),

  createIssue: (issue: Issue) =>
    request<{ success: boolean }>('/issues', {
      method: 'POST',
      body: JSON.stringify(issue),
    }),

  updateIssueStatus: (id: string, status: IssueStatus) =>
    request<{ success: boolean }>('/issues', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    }),

  // Usage Records
  getUsageRecords: () => request<UsageRecord[]>('/usage'),

  createUsageRecord: (record: UsageRecord) =>
    request<{ success: boolean }>('/usage', {
      method: 'POST',
      body: JSON.stringify(record),
    }),

  // Activities
  getActivities: () => request<Activity[]>('/activities'),

  logActivity: (activity: Activity) =>
    request<{ success: boolean }>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    }),

  // Notifications
  getNotifications: (target: 'user' | 'operator') =>
    request<AppNotification[]>(`/notifications?target=${target}`),

  createNotification: (
    notification: AppNotification,
    target: 'user' | 'operator'
  ) =>
    request<{ success: boolean }>('/notifications', {
      method: 'POST',
      body: JSON.stringify({ ...notification, target }),
    }),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>('/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ id }),
    }),

  markAllNotificationsRead: (target: 'user' | 'operator') =>
    request<{ success: boolean }>('/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ target, markAllRead: true }),
    }),

  // Database Seed / Reset
  resetDatabase: () =>
    request<{ success: boolean; message: string }>('/seed', {
      method: 'POST',
    }),
};

