/**
 * Workflow Builder & Manager Component
 * Allows SOC teams to create and manage security operations workflows
 */

'use client';

import React, { useState } from 'react';
import {
  Workflow,
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowAction,
} from '@/types';
import { useWorkflowStore } from '@/stores';
import { useHasPermission } from '@/components/ProtectedRoute';
import { Permission } from '@/types';

interface WorkflowBuilderProps {
  onWorkflowSave?: (workflow: Workflow) => void;
  editingWorkflow?: Workflow | null;
}

export function WorkflowBuilder({ onWorkflowSave, editingWorkflow }: WorkflowBuilderProps) {
  const canManageWorkflows = useHasPermission(Permission.MANAGE_POLICIES);
  const store = useWorkflowStore();

  const [formData, setFormData] = useState<Partial<Workflow>>(
    editingWorkflow || {
      name: '',
      description: '',
      status: WorkflowStatus.DRAFT,
      trigger: { type: WorkflowTriggerType.ALERT, conditions: {} },
      actions: [],
      enabled: false,
      priority: 1,
      executionCount: 0,
    }
  );

  const [actions, setActions] = useState<WorkflowAction[]>(editingWorkflow?.actions || []);
  const [newAction, setNewAction] = useState<Partial<WorkflowAction>>({
    type: WorkflowActionType.NOTIFICATION,
    enabled: true,
    order: actions.length + 1,
  });

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddAction = () => {
    if (newAction.type) {
      const action: WorkflowAction = {
        id: `action_${Date.now()}`,
        type: newAction.type as WorkflowActionType,
        config: newAction.config || {},
        order: newAction.order || actions.length + 1,
        enabled: newAction.enabled !== false,
      };

      setActions((prev) => [...prev, action]);
      setNewAction({
        type: WorkflowActionType.NOTIFICATION,
        enabled: true,
        order: actions.length + 2,
      });
    }
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveWorkflow = async () => {
    if (!formData.name || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    const workflow: Workflow = {
      id: editingWorkflow?.id || `workflow_${Date.now()}`,
      name: formData.name,
      description: formData.description,
      status: formData.status || WorkflowStatus.DRAFT,
      trigger: formData.trigger || { type: WorkflowTriggerType.ALERT, conditions: {} },
      actions,
      conditions: formData.conditions,
      enabled: formData.enabled || false,
      priority: formData.priority || 1,
      executionCount: editingWorkflow?.executionCount || 0,
      lastExecutedAt: editingWorkflow?.lastExecutedAt,
      createdAt: editingWorkflow?.createdAt || new Date(),
      updatedAt: new Date(),
      createdBy: editingWorkflow?.createdBy || 'current_user',
    };

    if (editingWorkflow) {
      store.updateWorkflow(workflow.id, workflow);
    } else {
      store.addWorkflow(workflow);
    }

    onWorkflowSave?.(workflow);
  };

  if (!canManageWorkflows) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          You do not have permission to manage workflows
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
        </h2>
        <p className="text-gray-600">
          Define automated responses to security events
        </p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Basic Information</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Workflow Name *
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="e.g., Auto-escalate Critical Phishing"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="Describe what this workflow does..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority || 1}
              onChange={(e) => handleFormChange('priority', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
              <option value={4}>Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status || WorkflowStatus.DRAFT}
              onChange={(e) => handleFormChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={WorkflowStatus.DRAFT}>Draft</option>
              <option value={WorkflowStatus.ACTIVE}>Active</option>
              <option value={WorkflowStatus.PAUSED}>Paused</option>
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled || false}
            onChange={(e) => handleFormChange('enabled', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
            Enable this workflow
          </label>
        </div>
      </div>

      {/* Trigger Configuration */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-700">Trigger</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trigger Type
          </label>
          <select
            value={formData.trigger?.type || WorkflowTriggerType.ALERT}
            onChange={(e) =>
              handleFormChange('trigger', {
                ...(formData.trigger || {}),
                type: e.target.value as WorkflowTriggerType,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={WorkflowTriggerType.ALERT}>Alert</option>
            <option value={WorkflowTriggerType.EVENT}>Event</option>
            <option value={WorkflowTriggerType.SCHEDULE}>Schedule</option>
            <option value={WorkflowTriggerType.MANUAL}>Manual</option>
          </select>
        </div>
      </div>

      {/* Actions Configuration */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-700">Actions</h3>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add Action
          </label>
          <div className="flex gap-2">
            <select
              value={newAction.type || ''}
              onChange={(e) =>
                setNewAction((prev) => ({
                  ...prev,
                  type: e.target.value as WorkflowActionType,
                }))
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select action type...</option>
              <option value={WorkflowActionType.NOTIFICATION}>Notification</option>
              <option value={WorkflowActionType.ESCALATE}>Escalate</option>
              <option value={WorkflowActionType.ASSIGN}>Assign</option>
              <option value={WorkflowActionType.UPDATE_STATUS}>Update Status</option>
              <option value={WorkflowActionType.EMAIL}>Email</option>
              <option value={WorkflowActionType.SLACK}>Slack</option>
            </select>
            <button
              onClick={handleAddAction}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Actions List */}
        {actions.length > 0 && (
          <div className="space-y-2">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
              >
                <div>
                  <div className="font-medium text-gray-800">
                    {index + 1}. {action.type}
                  </div>
                  {action.enabled && (
                    <div className="text-xs text-green-600">✓ Enabled</div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveAction(index)}
                  className="text-red-500 hover:text-red-700 font-semibold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t pt-4 flex justify-end gap-3">
        <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
        <button
          onClick={handleSaveWorkflow}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
        </button>
      </div>
    </div>
  );
}

/**
 * Workflow List Component
 */
export function WorkflowsList() {
  const store = useWorkflowStore();
  const workflows = Array.from(store.workflows.values());

  const getStatusColor = (status: WorkflowStatus): string => {
    switch (status) {
      case WorkflowStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case WorkflowStatus.PAUSED:
        return 'bg-yellow-100 text-yellow-800';
      case WorkflowStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-800">Workflows</h2>
      </div>

      {workflows.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No workflows configured yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Executions
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow) => (
                <tr key={workflow.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-800 font-medium">
                    {workflow.name}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        workflow.status
                      )}`}
                    >
                      {workflow.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {workflow.executionCount || 0}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-500 hover:text-blue-700 text-sm font-semibold">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
