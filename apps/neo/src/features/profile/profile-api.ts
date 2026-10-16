import { apiFetch } from '../api/api-client';

export type ProfileNotificationChannel = 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'NONE';

export type MyProfile = {
  official: {
    userId: string;
    email: string;
    fullName: string;
    documentMasked: string | null;
    birthDate: string | null;
    employeeNumber: string | null;
    departmentName: string | null;
    accountStatus: string;
    roles: string[];
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
    updatedAt: string;
  };
  preferences: {
    preferredName: string | null;
    phoneNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    primaryBase: string | null;
    notificationChannel: ProfileNotificationChannel;
    updatedAt: string | null;
  };
  editableFields: string[];
};

export type UpdateMyProfilePayload = {
  preferredName?: string | null;
  phoneNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  primaryBase?: string | null;
  notificationChannel?: ProfileNotificationChannel;
};

export async function getMyProfile() {
  return apiFetch<{ item: MyProfile }>('/auth/me/profile');
}

export async function updateMyProfile(payload: UpdateMyProfilePayload) {
  return apiFetch<{ item: MyProfile }>('/auth/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
