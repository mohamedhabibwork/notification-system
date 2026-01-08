import { ValidationError } from 'class-validator';

/**
 * Flattens class-validator ValidationError array into a simple object
 * with field names as keys and error message arrays as values.
 * 
 * Supports nested objects using dot notation (e.g., "recipient.email")
 * 
 * @param errors - Array of ValidationError from class-validator
 * @param parentPath - Internal parameter for recursive calls to track nested paths
 * @returns Object with field names as keys and error message arrays as values
 * 
 * @example
 * Input: ValidationError[]
 * Output: { "name": ["must be a string"], "recipient.email": ["must be an email"] }
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const errorMap: Record<string, string[]> = {};

  for (const error of errors) {
    const propertyPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    // If this error has constraints (validation rules that failed)
    if (error.constraints) {
      const messages = Object.values(error.constraints);
      
      // If there are already errors for this field, append to them
      if (errorMap[propertyPath]) {
        errorMap[propertyPath].push(...messages);
      } else {
        errorMap[propertyPath] = messages;
      }
    }

    // If this error has nested children (for nested objects or arrays)
    if (error.children && error.children.length > 0) {
      const nestedErrors = flattenValidationErrors(error.children, propertyPath);
      
      // Merge nested errors into the main error map
      for (const [nestedPath, nestedMessages] of Object.entries(nestedErrors)) {
        if (errorMap[nestedPath]) {
          errorMap[nestedPath].push(...nestedMessages);
        } else {
          errorMap[nestedPath] = nestedMessages;
        }
      }
    }
  }

  return errorMap;
}

/**
 * Helper function to format validation errors for consistent API responses
 * 
 * @param errors - Array of ValidationError from class-validator
 * @returns Formatted error object ready for API response
 */
export function formatValidationErrors(errors: ValidationError[]): {
  message: string;
  errors: Record<string, string[]>;
} {
  const flattenedErrors = flattenValidationErrors(errors);
  const errorCount = Object.keys(flattenedErrors).length;
  
  return {
    message: errorCount === 1 
      ? 'Validation failed for 1 field' 
      : `Validation failed for ${errorCount} fields`,
    errors: flattenedErrors,
  };
}
