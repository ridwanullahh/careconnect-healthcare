import { githubDB, collections } from './database';

export interface Cause {
  id: string;
  entity_id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  end_date: string;
  is_active: boolean;
  category: string;
}

export class CrowdfundingService {
  static async createCause(causeData: Partial<Cause>): Promise<Cause> {
    const cause = await githubDB.insert(collections.causes, {
      ...causeData,
      current_amount: 0,
      is_active: true,
    });
    return cause;
  }

  static async updateCause(causeId: string, updates: Partial<Cause>): Promise<Cause> {
    return await githubDB.update(collections.causes, causeId, updates);
  }

  static async deleteCause(causeId: string): Promise<void> {
    await githubDB.delete(collections.causes, causeId);
  }

  static async searchCauses(filters: {
    query?: string;
    category?: string;
    entity_id?: string;
    is_active?: boolean;
  }): Promise<Cause[]> {
    let causes = await githubDB.find(collections.causes, {});

    if (filters.query) {
      const query = filters.query.toLowerCase();
      causes = causes.filter(cause =>
        cause.title.toLowerCase().includes(query) ||
        cause.description.toLowerCase().includes(query)
      );
    }

    if (filters.category) {
      causes = causes.filter(cause => cause.category === filters.category);
    }

    if (filters.entity_id) {
      causes = causes.filter(cause => cause.entity_id === filters.entity_id);
    }

    if (filters.is_active !== undefined) {
      causes = causes.filter(cause => cause.is_active === filters.is_active);
    }

    return causes;
  }
}