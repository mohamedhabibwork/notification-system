export interface UserResponseDto {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  timezone?: string; // IANA timezone (e.g., 'America/New_York', 'Europe/London')
  metadata?: Record<string, unknown>;
  preferences?: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
  };
}

export interface UserSearchDto {
  userIds?: string[];
  userTypes?: string[];
  filters?: Record<string, unknown>;
}

export interface UserPreferencesDto {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  quietHours?: {
    start: string;
    end: string;
  };
  channels?: Record<string, boolean>;
}
