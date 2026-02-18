/**
 * Workflow & Automation Store
 * Zustand store for managing security operations workflows and automations
 */

import { create } from 'zustand';
import {
  Workflow,
  WorkflowStatus,
  WorkflowExecution,
  ErrorResponse,
} from '@/types';

interface WorkflowStoreState {
  workflows: Map<string, Workflow>;
  executions: Map<string, WorkflowExecution>;
  selectedWorkflow: Workflow | null;
  loading: boolean;
  error: ErrorResponse | null;
  totalWorkflows: number;
  lastUpdated: Date | null;

  // Workflow Management
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (workflowId: string, updates: Partial<Workflow>) => void;
  deleteWorkflow: (workflowId: string) => void;
  selectWorkflow: (workflow: Workflow | null) => void;

  // Workflow Execution
  recordExecution: (execution: WorkflowExecution) => void;
  updateExecution: (executionId: string, updates: Partial<WorkflowExecution>) => void;
  getExecutionHistory: (workflowId: string, limit?: number) => WorkflowExecution[];
  getExecutionStats: (workflowId: string) => {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };

  // Workflow Control
  enableWorkflow: (workflowId: string) => void;
  disableWorkflow: (workflowId: string) => void;
  triggerWorkflow: (workflowId: string, triggerData: any) => void;

  // Query & Filter
  getActiveWorkflows: () => Workflow[];
  getWorkflowsByStatus: (status: WorkflowStatus) => Workflow[];
  searchWorkflows: (query: string) => Workflow[];

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: ErrorResponse | null) => void;
  clearWorkflows: () => void;
}

export const useWorkflowStore = create<WorkflowStoreState>((set, get) => ({
  workflows: new Map(),
  executions: new Map(),
  selectedWorkflow: null,
  loading: false,
  error: null,
  totalWorkflows: 0,
  lastUpdated: null,

  setWorkflows: (workflows: Workflow[]) => {
    const workflowMap = new Map(workflows.map((wf) => [wf.id, wf]));
    set({ workflows: workflowMap, totalWorkflows: workflows.length });
  },

  addWorkflow: (workflow: Workflow) => {
    set((state) => {
      const newWorkflows = new Map(state.workflows);
      newWorkflows.set(workflow.id, workflow);
      return {
        workflows: newWorkflows,
        totalWorkflows: newWorkflows.size,
        lastUpdated: new Date(),
      };
    });
  },

  updateWorkflow: (workflowId: string, updates: Partial<Workflow>) => {
    set((state) => {
      const workflow = state.workflows.get(workflowId);
      if (!workflow) return state;

      const updated = { ...workflow, ...updates, updatedAt: new Date() };
      const newWorkflows = new Map(state.workflows);
      newWorkflows.set(workflowId, updated);

      return {
        workflows: newWorkflows,
        selectedWorkflow:
          state.selectedWorkflow?.id === workflowId ? updated : state.selectedWorkflow,
        lastUpdated: new Date(),
      };
    });
  },

  deleteWorkflow: (workflowId: string) => {
    set((state) => {
      const newWorkflows = new Map(state.workflows);
      newWorkflows.delete(workflowId);

      return {
        workflows: newWorkflows,
        selectedWorkflow:
          state.selectedWorkflow?.id === workflowId ? null : state.selectedWorkflow,
        totalWorkflows: newWorkflows.size,
      };
    });
  },

  selectWorkflow: (workflow: Workflow | null) => set({ selectedWorkflow: workflow }),

  recordExecution: (execution: WorkflowExecution) => {
    set((state) => {
      const newExecutions = new Map(state.executions);
      newExecutions.set(execution.id, execution);

      // Update workflow execution count
      const workflow = state.workflows.get(execution.workflowId);
      if (workflow) {
        const updated = {
          ...workflow,
          executionCount: (workflow.executionCount || 0) + 1,
          lastExecutedAt: new Date(),
        };
        const newWorkflows = new Map(state.workflows);
        newWorkflows.set(workflow.id, updated);

        return { executions: newExecutions, workflows: newWorkflows };
      }

      return { executions: newExecutions };
    });
  },

  updateExecution: (executionId: string, updates: Partial<WorkflowExecution>) => {
    set((state) => {
      const execution = state.executions.get(executionId);
      if (!execution) return state;

      const updated = { ...execution, ...updates };
      const newExecutions = new Map(state.executions);
      newExecutions.set(executionId, updated);

      return { executions: newExecutions };
    });
  },

  getExecutionHistory: (workflowId: string, limit: number = 10): WorkflowExecution[] => {
    const executions = Array.from(get().executions.values())
      .filter((exec) => exec.workflowId === workflowId)
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
      .slice(0, limit);

    return executions;
  },

  getExecutionStats: (workflowId: string) => {
    const executions = Array.from(get().executions.values()).filter(
      (exec) => exec.workflowId === workflowId && exec.status === 'completed'
    );

    const successful = executions.filter((exec) =>
      exec.results.every((result) => result.success)
    ).length;

    const failed = executions.length - successful;

    return {
      total: executions.length,
      successful,
      failed,
      successRate: executions.length > 0 ? (successful / executions.length) * 100 : 0,
    };
  },

  enableWorkflow: (workflowId: string) => {
    get().updateWorkflow(workflowId, { enabled: true, status: WorkflowStatus.ACTIVE });
  },

  disableWorkflow: (workflowId: string) => {
    get().updateWorkflow(workflowId, { enabled: false, status: WorkflowStatus.PAUSED });
  },

  triggerWorkflow: (workflowId: string, triggerData: any) => {
    const workflow = get().workflows.get(workflowId);
    if (!workflow || !workflow.enabled) {
      console.warn(`Workflow ${workflowId} is not available for execution`);
      return;
    }

    // Create execution record
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random()}`,
      workflowId,
      triggeredBy: 'system',
      triggeredAt: new Date(),
      status: 'pending',
      results: [],
    };

    get().recordExecution(execution);
    console.log(`Workflow ${workflowId} triggered`, execution);
  },

  getActiveWorkflows: (): Workflow[] => {
    return Array.from(get().workflows.values()).filter(
      (wf) => wf.enabled && wf.status === WorkflowStatus.ACTIVE
    );
  },

  getWorkflowsByStatus: (status: WorkflowStatus): Workflow[] => {
    return Array.from(get().workflows.values()).filter((wf) => wf.status === status);
  },

  searchWorkflows: (query: string): Workflow[] => {
    const lowerQuery = query.toLowerCase();
    return Array.from(get().workflows.values()).filter(
      (wf) =>
        wf.name.toLowerCase().includes(lowerQuery) ||
        wf.description.toLowerCase().includes(lowerQuery)
    );
  },

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: ErrorResponse | null) => {
    set({ error, loading: false });
    if (error) {
      console.error('Workflow Store Error:', error);
    }
  },

  clearWorkflows: () =>
    set({
      workflows: new Map(),
      executions: new Map(),
      selectedWorkflow: null,
      error: null,
      totalWorkflows: 0,
    }),
}));
