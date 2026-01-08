import {
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  IsNumber,
  IsEnum,
} from 'class-validator';

export enum EventType {
  ORDER_CREATED = 'order.created',
  ORDER_SHIPPED = 'order.shipped',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  USER_REGISTERED = 'user.registered',
  USER_PASSWORD_RESET = 'user.password-reset',
}

export class BaseEventDto {
  @IsString()
  eventId: string;

  @IsString()
  eventType: string;

  @IsNumber()
  timestamp: number;

  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class OrderCreatedEventDto extends BaseEventDto {
  @IsString()
  orderId: string;

  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsNumber()
  @IsOptional()
  orderTotal?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class OrderShippedEventDto extends BaseEventDto {
  @IsString()
  orderId: string;

  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentCompletedEventDto extends BaseEventDto {
  @IsString()
  paymentId: string;

  @IsString()
  customerId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PaymentFailedEventDto extends BaseEventDto {
  @IsString()
  paymentId: string;

  @IsString()
  customerId: string;

  @IsString()
  reason: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UserRegisteredEventDto extends BaseEventDto {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UserPasswordResetEventDto extends BaseEventDto {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  resetToken: string;

  @IsNumber()
  expiresAt: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
