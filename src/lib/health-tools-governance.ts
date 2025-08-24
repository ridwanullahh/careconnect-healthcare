// Health Tools Governance & Safety System
import { githubDB, collections } from './database';

export interface ToolVersion {
  id: string;
  toolId: string;
  version: string;
  promptTemplate: string;
  parameters: Record<string, any>;
  safetyGuardrails: string[];
  inputValidation: ValidationRule[];
  outputFilters: string[];
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  retiredAt?: string;
  retiredReason?: string;
}

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'phone' | 'date' | 'range' | 'enum';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  allowedValues?: string[];
  errorMessage: string;
}

export interface ToolIncident {
  id: string;
  toolId: string;
  toolVersionId?: string;
  userId: string;
  incidentType: 'safety_concern' | 'inappropriate_output' | 'technical_error' | 'misuse' | 'data_leak' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userInput?: string;
  toolOutput?: string;
  expectedOutput?: string;
  reportedAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  assignedTo?: string;
  resolvedAt?: string;
  resolution?: string;
  actionsTaken: string[];
}

export interface SafetyMetrics {
  toolId: string;
  totalUsage: number;
  incidentCount: number;
  safetyScore: number; // 0-100
  lastIncidentDate?: string;
  avgResponseTime: number;
  successRate: number;
  calculatedAt: string;
}

export class HealthToolsGovernanceService {
  // Create new tool version
  static async createToolVersion(
    toolId: string,
    promptTemplate: string,
    parameters: Record<string, any>,
    safetyGuardrails: string[],
    inputValidation: ValidationRule[],
    outputFilters: string[],
    createdBy: string
  ): Promise<ToolVersion> {
    // Get current version number
    const existingVersions = await githubDB.findMany(collections.tool_versions, { toolId });
    const versionNumber = `v${existingVersions.length + 1}.0`;

    const toolVersion: ToolVersion = {
      id: `tv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      toolId,
      version: versionNumber,
      promptTemplate,
      parameters,
      safetyGuardrails,
      inputValidation,
      outputFilters,
      isActive: false, // Requires approval
      createdAt: new Date().toISOString(),
      createdBy
    };

    await githubDB.create(collections.tool_versions, toolVersion);

    // Log audit trail
    await githubDB.create(collections.audit_logs, {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'tool_version_created',
      entityType: 'tool_version',
      entityId: toolVersion.id,
      performedBy: createdBy,
      performedAt: new Date().toISOString(),
      details: { toolId, version: versionNumber },
      ipAddress: 'client-side'
    });

    return toolVersion;
  }

  // Approve tool version
  static async approveToolVersion(versionId: string, approvedBy: string): Promise<void> {
    const version = await githubDB.findById(collections.tool_versions, versionId);
    if (!version) throw new Error('Tool version not found');

    // Deactivate current active version
    const activeVersions = await githubDB.findMany(collections.tool_versions, {
      toolId: version.toolId,
      isActive: true
    });

    for (const activeVersion of activeVersions) {
      await githubDB.update(collections.tool_versions, activeVersion.id, {
        isActive: false,
        retiredAt: new Date().toISOString(),
        retiredReason: 'Replaced by newer version'
      });
    }

    // Activate new version
    await githubDB.update(collections.tool_versions, versionId, {
      isActive: true,
      approvedAt: new Date().toISOString(),
      approvedBy
    });

    await githubDB.create(collections.audit_logs, {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: 'tool_version_approved',
      entityType: 'tool_version',
      entityId: versionId,
      performedBy: approvedBy,
      performedAt: new Date().toISOString(),
      details: { toolId: version.toolId, version: version.version },
      ipAddress: 'client-side'
    });
  }

  // Get active tool version
  static async getActiveToolVersion(toolId: string): Promise<ToolVersion | null> {
    return await githubDB.findOne(collections.tool_versions, {
      toolId,
      isActive: true
    });
  }

  // Validate input according to tool version rules
  static validateInput(input: Record<string, any>, validationRules: ValidationRule[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const rule of validationRules) {
      const value = input[rule.field];

      // Required field check
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      switch (rule.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(rule.errorMessage || `${rule.field} must be a string`);
          } else {
            if (rule.minLength && value.length < rule.minLength) {
              errors.push(rule.errorMessage || `${rule.field} must be at least ${rule.minLength} characters`);
            }
            if (rule.maxLength && value.length > rule.maxLength) {
              errors.push(rule.errorMessage || `${rule.field} must be at most ${rule.maxLength} characters`);
            }
            if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
              errors.push(rule.errorMessage || `${rule.field} format is invalid`);
            }
          }
          break;

        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(rule.errorMessage || `${rule.field} must be a number`);
          } else {
            if (rule.min !== undefined && numValue < rule.min) {
              errors.push(rule.errorMessage || `${rule.field} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && numValue > rule.max) {
              errors.push(rule.errorMessage || `${rule.field} must be at most ${rule.max}`);
            }
          }
          break;

        case 'email':
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(value)) {
            errors.push(rule.errorMessage || `${rule.field} must be a valid email address`);
          }
          break;

        case 'phone':
          const phonePattern = /^\+?[\d\s\-\(\)]+$/;
          if (!phonePattern.test(value)) {
            errors.push(rule.errorMessage || `${rule.field} must be a valid phone number`);
          }
          break;

        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(rule.errorMessage || `${rule.field} must be a valid date`);
          }
          break;

        case 'enum':
          if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            errors.push(rule.errorMessage || `${rule.field} must be one of: ${rule.allowedValues.join(', ')}`);
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Apply safety guardrails to prompt
  static applySafetyGuardrails(prompt: string, guardrails: string[]): string {
    let safePrompt = prompt;

    for (const guardrail of guardrails) {
      switch (guardrail) {
        case 'no_medical_diagnosis':
          safePrompt += '\n\nIMPORTANT: Do not provide medical diagnoses. Always recommend consulting healthcare professionals.';
          break;
        case 'no_prescription_advice':
          safePrompt += '\n\nIMPORTANT: Do not recommend specific medications or dosages. Direct users to consult their healthcare provider.';
          break;
        case 'emergency_disclaimer':
          safePrompt += '\n\nIMPORTANT: For medical emergencies, instruct users to call emergency services immediately.';
          break;
        case 'professional_consultation':
          safePrompt += '\n\nIMPORTANT: Always recommend consulting with appropriate healthcare professionals.';
          break;
        case 'no_personal_info':
          safePrompt += '\n\nIMPORTANT: Do not request or store personal identifying information.';
          break;
        default:
          safePrompt += `\n\nSAFETY RULE: ${guardrail}`;
      }
    }

    return safePrompt;
  }

  // Filter output for safety
  static filterOutput(output: string, filters: string[]): string {
    let filteredOutput = output;

    for (const filter of filters) {
      switch (filter) {
        case 'remove_diagnosis_language':
          filteredOutput = filteredOutput.replace(/\b(you have|diagnosed with|you are suffering from)\b/gi, 'you may have symptoms consistent with');
          break;
        case 'add_disclaimer':
          filteredOutput += '\n\n⚠️ This information is for educational purposes only and should not replace professional medical advice.';
          break;
        case 'emergency_check':
          if (/\b(emergency|urgent|immediate|call 911)\b/i.test(filteredOutput)) {
            filteredOutput = '🚨 EMERGENCY: Please call emergency services immediately. ' + filteredOutput;
          }
          break;
      }
    }

    return filteredOutput;
  }

  // Report tool incident
  static async reportIncident(
    toolId: string,
    userId: string,
    incidentType: ToolIncident['incidentType'],
    severity: ToolIncident['severity'],
    description: string,
    userInput?: string,
    toolOutput?: string,
    expectedOutput?: string,
    toolVersionId?: string
  ): Promise<ToolIncident> {
    const incident: ToolIncident = {
      id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      toolId,
      toolVersionId,
      userId,
      incidentType,
      severity,
      description,
      userInput,
      toolOutput,
      expectedOutput,
      reportedAt: new Date().toISOString(),
      status: 'open',
      actionsTaken: []
    };

    await githubDB.create(collections.tool_incidents, incident);

    // Create notification for admins
    await githubDB.create(collections.notifications, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'admin',
      type: 'tool_incident_reported',
      title: 'Health Tool Incident Reported',
      message: `${severity.toUpperCase()} severity incident reported for tool ${toolId}`,
      data: { incidentId: incident.id, toolId, severity },
      createdAt: new Date().toISOString(),
      read: false,
      priority: severity === 'critical' ? 'urgent' : 'high'
    });

    return incident;
  }

  // Update incident status
  static async updateIncidentStatus(
    incidentId: string,
    status: ToolIncident['status'],
    assignedTo?: string,
    resolution?: string,
    actionsTaken?: string[]
  ): Promise<void> {
    const updates: Partial<ToolIncident> = {
      status,
      assignedTo,
      resolution
    };

    if (status === 'resolved') {
      updates.resolvedAt = new Date().toISOString();
    }

    if (actionsTaken) {
      const incident = await githubDB.findById(collections.tool_incidents, incidentId);
      updates.actionsTaken = [...(incident?.actionsTaken || []), ...actionsTaken];
    }

    await githubDB.update(collections.tool_incidents, incidentId, updates);
  }

  // Calculate safety metrics
  static async calculateSafetyMetrics(toolId: string): Promise<SafetyMetrics> {
    const [usage, incidents] = await Promise.all([
      githubDB.findMany(collections.tool_results, { toolId }),
      githubDB.findMany(collections.tool_incidents, { toolId })
    ]);

    const totalUsage = usage.length;
    const incidentCount = incidents.length;
    const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
    const highIncidents = incidents.filter(i => i.severity === 'high').length;

    // Calculate safety score (0-100)
    let safetyScore = 100;
    if (totalUsage > 0) {
      const incidentRate = incidentCount / totalUsage;
      const criticalWeight = criticalIncidents * 50;
      const highWeight = highIncidents * 20;
      const mediumWeight = incidents.filter(i => i.severity === 'medium').length * 5;
      
      const totalPenalty = (criticalWeight + highWeight + mediumWeight) / totalUsage;
      safetyScore = Math.max(0, 100 - totalPenalty);
    }

    const successfulUsage = totalUsage - incidents.filter(i => i.incidentType === 'technical_error').length;
    const successRate = totalUsage > 0 ? (successfulUsage / totalUsage) * 100 : 100;

    // Calculate average response time (mock for now)
    const avgResponseTime = 2.5; // seconds

    const lastIncident = incidents.sort((a, b) => 
      new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    )[0];

    const metrics: SafetyMetrics = {
      toolId,
      totalUsage,
      incidentCount,
      safetyScore: Math.round(safetyScore),
      lastIncidentDate: lastIncident?.reportedAt,
      avgResponseTime,
      successRate: Math.round(successRate),
      calculatedAt: new Date().toISOString()
    };

    return metrics;
  }

  // Get incidents for review
  static async getIncidentsForReview(status?: string): Promise<ToolIncident[]> {
    const filter = status ? { status } : {};
    return await githubDB.findMany(collections.tool_incidents, filter);
  }

  // Get tool versions for approval
  static async getPendingToolVersions(): Promise<ToolVersion[]> {
    return await githubDB.findMany(collections.tool_versions, {
      isActive: false,
      approvedAt: { $exists: false }
    });
  }
}

export default HealthToolsGovernanceService;