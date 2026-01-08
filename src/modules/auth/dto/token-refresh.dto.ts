import { IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenRefreshRequestDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refresh_token: string;
}

export class TokenRefreshResponseDto {
  @ApiProperty({ description: 'New access token' })
  access_token: string;

  @ApiProperty({ description: 'New refresh token' })
  refresh_token: string;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  token_type: string;

  @ApiProperty({ description: 'Access token expiration in seconds' })
  expires_in: number;

  @ApiPropertyOptional({ description: 'Refresh token expiration in seconds' })
  refresh_expires_in?: number;

  @ApiPropertyOptional({ description: 'Scope' })
  scope?: string;
}
