/**
 * Environment Validator
 *
 * Validates required environment variables before seeding.
 * Provides clear error messages for missing or invalid configuration.
 */

interface ValidationError {
  variable: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate environment variables for seeding
 */
export function validateEnvironment(): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required: Database
  if (!process.env.DATABASE_URL) {
    errors.push({
      variable: 'DATABASE_URL',
      message: 'Database connection string is required',
      severity: 'error',
    });
  }

  // Required: Encryption key for provider credentials
  if (!process.env.ENCRYPTION_KEY) {
    errors.push({
      variable: 'ENCRYPTION_KEY',
      message: 'Encryption key is required for securing provider credentials',
      severity: 'error',
    });
  } else if (process.env.ENCRYPTION_KEY.length < 32) {
    warnings.push({
      variable: 'ENCRYPTION_KEY',
      message: 'Encryption key should be at least 32 characters for security',
      severity: 'warning',
    });
  }

  // Check at least one provider per channel
  const emailProviderEnabled =
    process.env.EMAIL_SENDGRID_ENABLED !== 'false' ||
    process.env.EMAIL_SES_ENABLED === 'true' ||
    process.env.EMAIL_MAILGUN_ENABLED === 'true';

  if (!emailProviderEnabled) {
    warnings.push({
      variable: 'EMAIL_*_ENABLED',
      message:
        'No email provider is enabled. At least one email provider should be configured.',
      severity: 'warning',
    });
  }

  const smsProviderEnabled =
    process.env.SMS_TWILIO_ENABLED !== 'false' ||
    process.env.SMS_SNS_ENABLED === 'true';

  if (!smsProviderEnabled) {
    warnings.push({
      variable: 'SMS_*_ENABLED',
      message:
        'No SMS provider is enabled. At least one SMS provider should be configured.',
      severity: 'warning',
    });
  }

  // Keycloak validation (if seeding Keycloak)
  if (process.env.SEED_KEYCLOAK === 'true') {
    if (!process.env.KEYCLOAK_SERVER_URL) {
      errors.push({
        variable: 'KEYCLOAK_SERVER_URL',
        message:
          'Keycloak server URL is required when SEED_KEYCLOAK is enabled',
        severity: 'error',
      });
    }

    if (
      !process.env.KEYCLOAK_ADMIN_USERNAME ||
      !process.env.KEYCLOAK_ADMIN_PASSWORD
    ) {
      errors.push({
        variable: 'KEYCLOAK_ADMIN_*',
        message:
          'Keycloak admin credentials are required when SEED_KEYCLOAK is enabled',
        severity: 'error',
      });
    }
  }

  // Optional but recommended: Redis
  if (!process.env.REDIS_HOST) {
    warnings.push({
      variable: 'REDIS_HOST',
      message:
        'Redis is not configured. Caching and queuing will not work properly.',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult): void {
  if (result.errors.length > 0) {
    console.error('\n❌ Environment Validation Errors:');
    result.errors.forEach((error) => {
      console.error(`  - ${error.variable}: ${error.message}`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Validation Warnings:');
    result.warnings.forEach((warning) => {
      console.warn(`  - ${warning.variable}: ${warning.message}`);
    });
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('\n✅ Environment validation passed!');
  } else if (result.valid) {
    console.log('\n✅ Environment validation passed with warnings.');
  } else {
    console.error(
      '\n❌ Environment validation failed. Please fix the errors above before seeding.',
    );
  }
}

/**
 * Validate and exit if errors found
 */
export function validateOrExit(): void {
  const result = validateEnvironment();
  printValidationResults(result);

  if (!result.valid) {
    process.exit(1);
  }
}
