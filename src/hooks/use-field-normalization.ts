// Field Normalization Hook for consistent snake_case usage
import { useMemo } from 'react';

interface FieldMapping {
  [camelCase: string]: string; // snake_case
}

// Global field mapping for consistency
const FIELD_MAPPINGS: FieldMapping = {
  // User fields
  userId: 'user_id',
  firstName: 'first_name',
  lastName: 'last_name',
  dateOfBirth: 'date_of_birth',
  phoneNumber: 'phone_number',
  emergencyContact: 'emergency_contact',
  medicalHistory: 'medical_history',
  isActive: 'is_active',
  lastLogin: 'last_login',
  
  // Entity fields
  entityId: 'entity_id',
  entityType: 'entity_type',
  legalName: 'legal_name',
  displayName: 'display_name',
  businessHours: 'business_hours',
  verificationStatus: 'verification_status',
  
  // Booking fields
  patientId: 'patient_id',
  appointmentDate: 'appointment_date',
  appointmentTime: 'appointment_time',
  serviceId: 'service_id',
  bookingStatus: 'booking_status',
  
  // Common fields
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  isDeleted: 'is_deleted',
  
  // Health tools
  toolId: 'tool_id',
  toolResults: 'tool_results',
  executionTime: 'execution_time',
  
  // Payments
  paymentId: 'payment_id',
  paymentStatus: 'payment_status',
  paymentMethod: 'payment_method',
  transactionId: 'transaction_id',
  
  // Course/LMS
  courseId: 'course_id',
  enrollmentDate: 'enrollment_date',
  completionDate: 'completion_date',
  certificateId: 'certificate_id'
};

export const useFieldNormalization = () => {
  const normalizeFields = useMemo(() => {
    return {
      // Convert camelCase object to snake_case for DB operations
      toSnakeCase: (obj: Record<string, any>): Record<string, any> => {
        const normalized: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(obj)) {
          const snakeKey = FIELD_MAPPINGS[key] || convertToSnakeCase(key);
          normalized[snakeKey] = value;
        }
        
        return normalized;
      },

      // Convert snake_case object to camelCase for UI operations
      toCamelCase: (obj: Record<string, any>): Record<string, any> => {
        const normalized: Record<string, any> = {};
        const reverseMapping = Object.fromEntries(
          Object.entries(FIELD_MAPPINGS).map(([camel, snake]) => [snake, camel])
        );
        
        for (const [key, value] of Object.entries(obj)) {
          const camelKey = reverseMapping[key] || convertToCamelCase(key);
          normalized[camelKey] = value;
        }
        
        return normalized;
      },

      // Normalize a single field name
      normalizeField: (fieldName: string, toSnakeCase: boolean = true): string => {
        if (toSnakeCase) {
          return FIELD_MAPPINGS[fieldName] || convertToSnakeCase(fieldName);
        } else {
          const reverseMapping = Object.fromEntries(
            Object.entries(FIELD_MAPPINGS).map(([camel, snake]) => [snake, camel])
          );
          return reverseMapping[fieldName] || convertToCamelCase(fieldName);
        }
      },

      // Build query with normalized field names
      buildQuery: (query: Record<string, any>): Record<string, any> => {
        const normalized: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(query)) {
          const snakeKey = FIELD_MAPPINGS[key] || convertToSnakeCase(key);
          normalized[snakeKey] = value;
        }
        
        return normalized;
      }
    };
  }, []);

  return normalizeFields;
};

// Helper functions for string conversion
function convertToSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function convertToCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Validation hook to ensure queries use proper field names
export const useQueryValidation = () => {
  const validateQuery = (query: Record<string, any>, expectedFields: string[]): boolean => {
    const queryFields = Object.keys(query);
    const invalidFields = queryFields.filter(field => 
      !expectedFields.includes(field) && 
      !Object.values(FIELD_MAPPINGS).includes(field)
    );
    
    if (invalidFields.length > 0) {
      console.warn('Query contains invalid/non-normalized fields:', invalidFields);
      return false;
    }
    
    return true;
  };

  return { validateQuery };
};

// Common field sets for validation
export const COMMON_FIELD_SETS = {
  USER_FIELDS: [
    'user_id', 'email', 'first_name', 'last_name', 'phone_number', 
    'date_of_birth', 'is_active', 'created_at', 'updated_at'
  ],
  ENTITY_FIELDS: [
    'entity_id', 'entity_type', 'legal_name', 'display_name', 
    'verification_status', 'is_active', 'created_at', 'updated_at'
  ],
  BOOKING_FIELDS: [
    'booking_id', 'patient_id', 'entity_id', 'service_id', 
    'appointment_date', 'appointment_time', 'booking_status', 'created_at'
  ],
  HEALTH_TOOL_FIELDS: [
    'tool_id', 'user_id', 'tool_results', 'execution_time', 'created_at'
  ]
};