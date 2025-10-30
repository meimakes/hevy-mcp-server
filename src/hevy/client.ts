import {
  HevyConfig,
  Workout,
  CreateWorkoutInput,
  UpdateWorkoutInput,
  WorkoutCountResponse,
  WorkoutEvent,
  Routine,
  CreateRoutineInput,
  UpdateRoutineInput,
  ExerciseTemplate,
  ExerciseProgress,
  ExerciseStats,
  ExerciseProgressParams,
  RoutineFolder,
  CreateFolderInput,
  WebhookSubscription,
  CreateWebhookInput,
  PaginationParams,
  WorkoutQueryParams,
} from './types.js';

export class HevyClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: HevyConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.hevyapp.com';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Hevy API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Hevy API request failed: ${String(error)}`);
    }
  }

  // ===== Workout Methods =====

  async getWorkouts(params: WorkoutQueryParams = {}): Promise<Workout[]> {
    const { page = 0, pageSize = 10, startDate, endDate } = params;
    let endpoint = `/v1/workouts?page=${page}&pageSize=${pageSize}`;

    if (startDate) {
      endpoint += `&startDate=${startDate}`;
    }
    if (endDate) {
      endpoint += `&endDate=${endDate}`;
    }

    const response = await this.request<{ workouts: Workout[] }>(endpoint);
    return response.workouts || [];
  }

  async getWorkout(id: string): Promise<Workout> {
    return this.request<Workout>(`/v1/workouts/${id}`);
  }

  async createWorkout(data: CreateWorkoutInput): Promise<Workout> {
    return this.request<Workout>('/v1/workouts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkout(id: string, data: UpdateWorkoutInput): Promise<Workout> {
    return this.request<Workout>(`/v1/workouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.request(`/v1/workouts/${id}`, {
      method: 'DELETE',
    });
  }

  async getWorkoutCount(): Promise<WorkoutCountResponse> {
    return this.request<WorkoutCountResponse>('/v1/workouts/count');
  }

  async getWorkoutEvents(sinceDate: string): Promise<WorkoutEvent[]> {
    const response = await this.request<{ events: WorkoutEvent[] }>(
      `/v1/workouts/events?since=${sinceDate}`
    );
    return response.events || [];
  }

  // ===== Routine Methods =====

  async getRoutines(params: PaginationParams = {}): Promise<Routine[]> {
    const { page = 0, pageSize = 50 } = params;
    const response = await this.request<{ routines: Routine[] }>(
      `/v1/routines?page=${page}&pageSize=${pageSize}`
    );
    return response.routines || [];
  }

  async getRoutine(id: string): Promise<Routine> {
    return this.request<Routine>(`/v1/routines/${id}`);
  }

  async createRoutine(data: CreateRoutineInput): Promise<Routine> {
    return this.request<Routine>('/v1/routines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRoutine(id: string, data: UpdateRoutineInput): Promise<Routine> {
    return this.request<Routine>(`/v1/routines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRoutine(id: string): Promise<void> {
    await this.request(`/v1/routines/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== Exercise Methods =====

  async getExerciseTemplates(params: PaginationParams = {}): Promise<ExerciseTemplate[]> {
    const { page = 0, pageSize = 50 } = params;
    const response = await this.request<{ exercise_templates: ExerciseTemplate[] }>(
      `/v1/exercise_templates?page=${page}&pageSize=${pageSize}`
    );
    return response.exercise_templates || [];
  }

  async getExerciseTemplate(id: string): Promise<ExerciseTemplate> {
    return this.request<ExerciseTemplate>(`/v1/exercise_templates/${id}`);
  }

  async getExerciseProgress(params: ExerciseProgressParams): Promise<ExerciseProgress[]> {
    const { exercise_template_id, start_date, end_date, limit = 50 } = params;
    let endpoint = `/v1/exercises/${exercise_template_id}/progress?limit=${limit}`;

    if (start_date) {
      endpoint += `&start_date=${start_date}`;
    }
    if (end_date) {
      endpoint += `&end_date=${end_date}`;
    }

    const response = await this.request<{ progress: ExerciseProgress[] }>(endpoint);
    return response.progress || [];
  }

  async getExerciseStats(exerciseTemplateId: string): Promise<ExerciseStats> {
    return this.request<ExerciseStats>(
      `/v1/exercises/${exerciseTemplateId}/stats`
    );
  }

  // ===== Folder Methods =====

  async getRoutineFolders(): Promise<RoutineFolder[]> {
    const response = await this.request<{ folders: RoutineFolder[] }>(
      '/v1/routine_folders'
    );
    return response.folders || [];
  }

  async getRoutineFolder(id: string): Promise<RoutineFolder> {
    return this.request<RoutineFolder>(`/v1/routine_folders/${id}`);
  }

  async createRoutineFolder(data: CreateFolderInput): Promise<RoutineFolder> {
    return this.request<RoutineFolder>('/v1/routine_folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRoutineFolder(id: string, data: CreateFolderInput): Promise<RoutineFolder> {
    return this.request<RoutineFolder>(`/v1/routine_folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRoutineFolder(id: string): Promise<void> {
    await this.request(`/v1/routine_folders/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== Webhook Methods =====

  async getWebhookSubscription(): Promise<WebhookSubscription | null> {
    try {
      return await this.request<WebhookSubscription>('/v1/webhooks/subscription');
    } catch (error) {
      // Return null if no subscription exists (404)
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createWebhookSubscription(data: CreateWebhookInput): Promise<WebhookSubscription> {
    return this.request<WebhookSubscription>('/v1/webhooks/subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWebhookSubscription(): Promise<void> {
    await this.request('/v1/webhooks/subscription', {
      method: 'DELETE',
    });
  }
}
