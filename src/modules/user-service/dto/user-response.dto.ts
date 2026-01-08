export interface UserResponseDto {
  id: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  metadata?: Record<string, any>;
  preferences?: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
  };
}

export interface UserSearchDto {
  userIds?: string[];
  userTypes?: string[];
  filters?: Record<string, any>;
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
