import {
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EventType {
  ORDER_CREATED = 'order.created',
  ORDER_SHIPPED = 'order.shipped',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  USER_REGISTERED = 'user.registered',
  USER_PASSWORD_RESET = 'user.password-reset',
}

export class BaseEventDto {
  @ApiProperty({ description: 'Unique event ID', example: 'evt-123' })
  @IsString()
  eventId: string;

  @ApiProperty({
    description: 'Event type',
    enum: EventType,
    example: EventType.ORDER_CREATED,
  })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Unix timestamp', example: 1704722400000 })
  @IsNumber()
  timestamp: number;

  @ApiPropertyOptional({ description: 'Tenant ID', example: '1' })
  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class OrderCreatedEventDto extends BaseEventDto {
  @ApiProperty({ description: 'Order ID', example: 'order-123' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Customer ID', example: 'customer-456' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Customer email',
    example: 'customer@example.com',
  })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Order total amount', example: 99.99 })
  @IsNumber()
  @IsOptional()
  orderTotal?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { items: 3 },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class OrderShippedEventDto extends BaseEventDto {
  @ApiProperty({ description: 'Order ID', example: 'order-123' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Customer ID', example: 'customer-456' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ description: 'Tracking number', example: 'TRACK123' })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { carrier: 'UPS' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class PaymentCompletedEventDto extends BaseEventDto {
  @ApiProperty({ description: 'Payment ID', example: 'pay-123' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'Customer ID', example: 'customer-456' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Payment amount', example: 99.99 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Related order ID',
    example: 'order-123',
  })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { method: 'credit_card' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class PaymentFailedEventDto extends BaseEventDto {
  @ApiProperty({ description: 'Payment ID', example: 'pay-123' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'Customer ID', example: 'customer-456' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Failure reason', example: 'Insufficient funds' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { attemptNumber: 1 },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UserRegisteredEventDto extends BaseEventDto {
  @ApiProperty({ description: 'User ID', example: 'user-123' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'web' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UserPasswordResetEventDto extends BaseEventDto {
  @ApiProperty({ description: 'User ID', example: 'user-123' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password reset token',
    example: 'reset-token-abc',
  })
  @IsString()
  resetToken: string;

  @ApiProperty({
    description: 'Token expiration timestamp',
    example: 1704808800000,
  })
  @IsNumber()
  expiresAt: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { ipAddress: '1.2.3.4' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
