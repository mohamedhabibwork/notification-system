import { IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenValidationRequestDto {
  @ApiProperty({ description: 'JWT token to validate' })
  @IsString()
  token: string;
}

export class TokenValidationResponseDto {
  @ApiProperty({ description: 'Whether the token is valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Validation error message if invalid' })
  error?: string;

  @ApiPropertyOptional({ description: 'Decoded token payload' })
  payload?: {
    sub?: string;
    email?: string;
    preferred_username?: string;
    clientId?: string;
    azp?: string;
    scope?: string;
    tenant_id?: string;
    user_type?: string;
    realm_access?: {
      roles: string[];
    };
    resource_access?: Record<string, { roles: string[] }>;
    aud?: string | string[];
    exp?: number;
    iat?: number;
    iss?: string;
  };

  @ApiPropertyOptional({ description: 'Token expiration timestamp' })
  expiresAt?: number;

  @ApiPropertyOptional({ description: 'Seconds until token expiration' })
  expiresIn?: number;

  @ApiPropertyOptional({ description: 'Whether token is expired' })
  expired?: boolean;

  @ApiPropertyOptional({ description: 'Token type (user or service)' })
  tokenType?: 'user' | 'service';
}
