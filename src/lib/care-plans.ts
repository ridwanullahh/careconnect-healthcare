// Care Plan Management Service for Hospital Management System
import { githubDB, collections } from './database';
import { logger } from './observability';

// Care Plan Interface
export interface CarePlan {
  id: string;
  patient_id: string;
  encounter_id?: string;
  entity_id: string;
  
  // Plan details
  title: string;
  description: string;
  category: 'assessment' | 'treatment' | 'education' | 'prevention' | 'discharge' | 'follow_up';
  status: 'draft' | 'active' | 'on_hold' | 'revoked' | 'completed' | 'entered_in_error';
  intent: 'proposal' | 'plan' | 'order' | 'option';
  
  // Timeline
  period: {
    start: string;
    end?: string;
  };
  
  // Goals
  goals: Array<{
    id: string;
    description: string;
    category: 'dietary' | 'safety' | 'behavioral' | 'nursing' | 'physiotherapy' | 'other';
    priority: 'high' | 'medium' | 'low';
    target_date?: string;
    status: 'proposed' | 'planned' | 'accepted' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    achievement_status?: 'in_progress' | 'improving' | 'worsening' | 'no_change' | 'achieved' | 'sustaining' | 'not_achieved';
    notes?: string;
  }>;
  
  // Activities
  activities: Array<{
    id: string;
    title: string;
    description: string;
    category: 'medication' | 'procedure' | 'encounter' | 'observation' | 'supply_delivery' | 'education' | 'other';
    status: 'not_started' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'stopped';
    scheduled_timing?: {
      repeat?: {
        frequency: number;
        period: 'hour' | 'day' | 'week' | 'month';
        duration_weeks?: number;
      };
      scheduled_date?: string;
      scheduled_time?: string;
    };
    assigned_to?: string; // Staff ID
    location?: string;
    instructions?: string;
    notes?: string;
  }>;
  
  // Team
  care_team: Array<{
    member_id: string;
    role: 'primary_physician' | 'nurse' | 'specialist' | 'therapist' | 'social_worker' | 'pharmacist' | 'other';
    name: string;
    contact?: string;
  }>;
  
  // Conditions addressed
  addresses?: string[]; // Condition IDs
  
  // Supporting info
  supporting_info?: string[];
  
  // Notes
  notes?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

export class CarePlanService {
  
  // Create care plan
  static async createCarePlan(planData: {
    patient_id: string;
    encounter_id?: string;
    entity_id: string;
    title: string;
    description: string;
    category: CarePlan['category'];
    intent: CarePlan['intent'];
    period: CarePlan['period'];
    goals: CarePlan['goals'];
    activities: CarePlan['activities'];
    care_team: CarePlan['care_team'];
    addresses?: string[];
    supporting_info?: string[];
    notes?: string;
    created_by: string;
  }): Promise<CarePlan> {
    try {
      const carePlan = await githubDB.insert(collections.care_plans, {
        ...planData,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('care_plan_created', carePlan.id, planData.created_by);
      
      logger.info('care_plan_created', 'Care plan created successfully', {
        plan_id: carePlan.id,
        patient_id: planData.patient_id,
        title: planData.title,
        goals_count: planData.goals.length,
        activities_count: planData.activities.length
      });
      
      return carePlan;
    } catch (error) {
      logger.error('care_plan_creation_failed', 'Failed to create care plan', { error: error.message });
      throw error;
    }
  }
  
  // Update care plan status
  static async updateCarePlanStatus(planId: string, status: CarePlan['status'], updatedBy: string, notes?: string): Promise<CarePlan> {
    try {
      const updates: any = {
        status: status,
        updated_at: new Date().toISOString()
      };
      
      if (notes) {
        const existingPlan = await githubDB.findById(collections.care_plans, planId);
        updates.notes = existingPlan?.notes ? `${existingPlan.notes}\n---\n${notes}` : notes;
      }
      
      const plan = await githubDB.update(collections.care_plans, planId, updates);
      
      await this.logAuditEvent('care_plan_status_updated', planId, updatedBy, {
        new_status: status,
        notes: notes
      });
      
      return plan;
    } catch (error) {
      logger.error('care_plan_status_update_failed', 'Failed to update care plan status', { 
        plan_id: planId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Update goal status
  static async updateGoalStatus(planId: string, goalId: string, status: CarePlan['goals'][0]['status'], achievementStatus?: CarePlan['goals'][0]['achievement_status'], notes?: string, updatedBy?: string): Promise<CarePlan> {
    try {
      const plan = await githubDB.findById(collections.care_plans, planId);
      if (!plan) throw new Error('Care plan not found');
      
      const updatedGoals = plan.goals.map(goal => {
        if (goal.id === goalId) {
          return {
            ...goal,
            status: status,
            achievement_status: achievementStatus || goal.achievement_status,
            notes: notes || goal.notes
          };
        }
        return goal;
      });
      
      const updatedPlan = await githubDB.update(collections.care_plans, planId, {
        goals: updatedGoals,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('care_plan_goal_updated', planId, updatedBy || 'system', {
        goal_id: goalId,
        new_status: status,
        achievement_status: achievementStatus
      });
      
      return updatedPlan;
    } catch (error) {
      logger.error('goal_status_update_failed', 'Failed to update goal status', { 
        plan_id: planId, 
        goal_id: goalId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Update activity status
  static async updateActivityStatus(planId: string, activityId: string, status: CarePlan['activities'][0]['status'], notes?: string, updatedBy?: string): Promise<CarePlan> {
    try {
      const plan = await githubDB.findById(collections.care_plans, planId);
      if (!plan) throw new Error('Care plan not found');
      
      const updatedActivities = plan.activities.map(activity => {
        if (activity.id === activityId) {
          return {
            ...activity,
            status: status,
            notes: notes || activity.notes
          };
        }
        return activity;
      });
      
      const updatedPlan = await githubDB.update(collections.care_plans, planId, {
        activities: updatedActivities,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('care_plan_activity_updated', planId, updatedBy || 'system', {
        activity_id: activityId,
        new_status: status
      });
      
      return updatedPlan;
    } catch (error) {
      logger.error('activity_status_update_failed', 'Failed to update activity status', { 
        plan_id: planId, 
        activity_id: activityId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get patient care plans
  static async getPatientCarePlans(patientId: string, status?: CarePlan['status']): Promise<CarePlan[]> {
    try {
      const filters: any = { patient_id: patientId };
      if (status) filters.status = status;
      
      const plans = await githubDB.find(collections.care_plans, filters);
      
      return plans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      logger.error('get_patient_care_plans_failed', 'Failed to get patient care plans', { 
        patient_id: patientId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get active care plans for entity
  static async getActiveCarePlans(entityId: string): Promise<CarePlan[]> {
    try {
      const plans = await githubDB.find(collections.care_plans, {
        entity_id: entityId,
        status: 'active'
      });
      
      return plans.sort((a, b) => new Date(a.period.start).getTime() - new Date(b.period.start).getTime());
    } catch (error) {
      logger.error('get_active_care_plans_failed', 'Failed to get active care plans', { 
        entity_id: entityId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get care plans by staff member
  static async getCarePlansByStaff(staffId: string): Promise<CarePlan[]> {
    try {
      const allPlans = await githubDB.find(collections.care_plans, { status: 'active' });
      
      // Filter plans where staff member is in care team or assigned to activities
      const staffPlans = allPlans.filter(plan => {
        // Check if staff is in care team
        const inCareTeam = plan.care_team.some(member => member.member_id === staffId);
        
        // Check if staff is assigned to any activities
        const assignedToActivity = plan.activities.some(activity => activity.assigned_to === staffId);
        
        return inCareTeam || assignedToActivity;
      });
      
      return staffPlans.sort((a, b) => new Date(a.period.start).getTime() - new Date(b.period.start).getTime());
    } catch (error) {
      logger.error('get_care_plans_by_staff_failed', 'Failed to get care plans by staff', { 
        staff_id: staffId, 
        error: error.message 
      });
      return [];
    }
  }
  
  // Get due activities
  static async getDueActivities(entityId: string, date?: string): Promise<Array<{
    care_plan: CarePlan;
    activity: CarePlan['activities'][0];
    patient_id: string;
  }>> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const plans = await this.getActiveCarePlans(entityId);
      
      const dueActivities = [];
      
      for (const plan of plans) {
        for (const activity of plan.activities) {
          if (activity.status === 'scheduled' && activity.scheduled_timing?.scheduled_date === targetDate) {
            dueActivities.push({
              care_plan: plan,
              activity: activity,
              patient_id: plan.patient_id
            });
          }
        }
      }
      
      // Sort by scheduled time
      return dueActivities.sort((a, b) => {
        const timeA = a.activity.scheduled_timing?.scheduled_time || '00:00';
        const timeB = b.activity.scheduled_timing?.scheduled_time || '00:00';
        return timeA.localeCompare(timeB);
      });
    } catch (error) {
      logger.error('get_due_activities_failed', 'Failed to get due activities', { error: error.message });
      return [];
    }
  }
  
  // Add goal to care plan
  static async addGoal(planId: string, goal: Omit<CarePlan['goals'][0], 'id'>, addedBy: string): Promise<CarePlan> {
    try {
      const plan = await githubDB.findById(collections.care_plans, planId);
      if (!plan) throw new Error('Care plan not found');
      
      const newGoal = {
        ...goal,
        id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      const updatedGoals = [...plan.goals, newGoal];
      
      const updatedPlan = await githubDB.update(collections.care_plans, planId, {
        goals: updatedGoals,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('care_plan_goal_added', planId, addedBy, {
        goal_id: newGoal.id,
        goal_description: goal.description
      });
      
      return updatedPlan;
    } catch (error) {
      logger.error('add_goal_failed', 'Failed to add goal to care plan', { 
        plan_id: planId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Add activity to care plan
  static async addActivity(planId: string, activity: Omit<CarePlan['activities'][0], 'id'>, addedBy: string): Promise<CarePlan> {
    try {
      const plan = await githubDB.findById(collections.care_plans, planId);
      if (!plan) throw new Error('Care plan not found');
      
      const newActivity = {
        ...activity,
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      const updatedActivities = [...plan.activities, newActivity];
      
      const updatedPlan = await githubDB.update(collections.care_plans, planId, {
        activities: updatedActivities,
        updated_at: new Date().toISOString()
      });
      
      await this.logAuditEvent('care_plan_activity_added', planId, addedBy, {
        activity_id: newActivity.id,
        activity_title: activity.title
      });
      
      return updatedPlan;
    } catch (error) {
      logger.error('add_activity_failed', 'Failed to add activity to care plan', { 
        plan_id: planId, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // Get care plan statistics
  static async getCarePlanStats(entityId: string, startDate: string, endDate: string): Promise<{
    total_plans: number;
    active_plans: number;
    completed_plans: number;
    goals_achieved: number;
    activities_completed: number;
    by_category: { [key: string]: number };
  }> {
    try {
      let plans = await githubDB.find(collections.care_plans, { entity_id: entityId });
      
      // Filter by date range
      plans = plans.filter(plan => {
        const planDate = plan.created_at;
        return planDate >= startDate && planDate <= endDate;
      });
      
      const stats = {
        total_plans: plans.length,
        active_plans: 0,
        completed_plans: 0,
        goals_achieved: 0,
        activities_completed: 0,
        by_category: {} as { [key: string]: number }
      };
      
      plans.forEach(plan => {
        // Count by status
        if (plan.status === 'active') stats.active_plans++;
        if (plan.status === 'completed') stats.completed_plans++;
        
        // Count by category
        stats.by_category[plan.category] = (stats.by_category[plan.category] || 0) + 1;
        
        // Count achieved goals
        plan.goals.forEach(goal => {
          if (goal.achievement_status === 'achieved') stats.goals_achieved++;
        });
        
        // Count completed activities
        plan.activities.forEach(activity => {
          if (activity.status === 'completed') stats.activities_completed++;
        });
      });
      
      return stats;
    } catch (error) {
      logger.error('get_care_plan_stats_failed', 'Failed to get care plan statistics', { error: error.message });
      return {
        total_plans: 0,
        active_plans: 0,
        completed_plans: 0,
        goals_achieved: 0,
        activities_completed: 0,
        by_category: {}
      };
    }
  }
  
  // Log audit events
  private static async logAuditEvent(action: string, planId: string, userId: string, metadata?: any): Promise<void> {
    try {
      await githubDB.insert(collections.audit_logs, {
        action,
        resource_type: 'care_plan',
        resource_id: planId,
        user_id: userId,
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        ip_address: 'unknown',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });
    } catch (error) {
      logger.error('audit_log_failed', 'Failed to log audit event', { error: error.message });
    }
  }
}