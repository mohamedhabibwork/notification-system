import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserAuthInfoDto {
  @ApiProperty({ description: 'User ID (subject)' })
  sub: string;

  @ApiPropertyOptional({ description: 'User email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Preferred username' })
  preferred_username?: string;

  @ApiPropertyOptional({ description: 'Tenant ID' })
  tenant_id?: string;

  @ApiPropertyOptional({ description: 'User type' })
  user_type?: string;

  @ApiPropertyOptional({ description: 'Realm roles', type: [String] })
  realm_roles?: string[];

  @ApiPropertyOptional({
    description:
      'Resource access roles (key-value pairs where key is resource name and value is array of role names)',
    type: 'object',
    additionalProperties: true,
  })
  resource_roles?: Record<string, string[]>;

  @ApiProperty({ description: 'Token expiration timestamp' })
  exp: number;

  @ApiProperty({ description: 'Token issued at timestamp' })
  iat: number;
}

export class ServiceAuthInfoDto {
  @ApiProperty({ description: 'Service client ID' })
  clientId: string;

  @ApiProperty({ description: 'Service name' })
  serviceName: string;

  @ApiPropertyOptional({ description: 'Authorized party' })
  azp?: string;

  @ApiPropertyOptional({ description: 'Scopes' })
  scope?: string;

  @ApiPropertyOptional({
    description:
      'Resource access roles (key-value pairs where key is resource name and value is array of role names)',
    type: 'object',
    additionalProperties: true,
  })
  resource_roles?: Record<string, string[]>;

  @ApiProperty({ description: 'Token expiration timestamp' })
  exp: number;

  @ApiProperty({ description: 'Token issued at timestamp' })
  iat: number;
}

export class AuthInfoResponseDto {
  @ApiProperty({
    description: 'Authentication type',
    enum: ['user', 'service'],
  })
  type: 'user' | 'service';

  @ApiPropertyOptional({
    description: 'User authentication info',
    type: UserAuthInfoDto,
  })
  user?: UserAuthInfoDto;

  @ApiPropertyOptional({
    description: 'Service authentication info',
    type: ServiceAuthInfoDto,
  })
  service?: ServiceAuthInfoDto;

  @ApiProperty({ description: 'Token expiration timestamp' })
  expiresAt: number;

  @ApiProperty({ description: 'Seconds until token expiration' })
  expiresIn: number;
}
