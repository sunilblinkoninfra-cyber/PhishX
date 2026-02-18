'use client';

import React, { useState, useCallback } from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Badge from '@/components/common/Badge';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { APIClient } from '@/services/apiClient';
import { UserRole } from '@/types/api';

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const { addToast } = useUIStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    name: user?.name || '',
    theme: 'light' as const,
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await APIClient.users.update(user?.id || '', {
        email: formData.email,
        name: formData.name,
      });

      if (user) {
        setUser({ ...user, email: formData.email, name: formData.name });
      }

      addToast('Profile updated successfully', 'success');
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      addToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    addToast('You have been logged out', 'info');
  };

  const roleColors: Record<UserRole, string> = {
    SOC_ANALYST: 'bg-blue-100 text-blue-900',
    SOC_ADMIN: 'bg-purple-100 text-purple-900',
    AUDITOR: 'bg-green-100 text-green-900',
  };

  const roleDescriptions: Record<UserRole, string> = {
    SOC_ANALYST: 'Can investigate alerts and update status',
    SOC_ADMIN: 'Full system access including user and policy management',
    AUDITOR: 'Read-only access to audit trails and reports',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <Card variant="elevated">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
            {!isEditing && (
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                disabled={isSaving}
              >
                Edit Profile
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSaving}
                />
              ) : (
                <p className="px-3 py-2 bg-gray-100 rounded-md text-gray-900">{user?.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name
              </label>
              {isEditing ? (
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={isSaving}
                />
              ) : (
                <p className="px-3 py-2 bg-gray-100 rounded-md text-gray-900">{user?.name || 'Not set'}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="primary"
                onClick={handleSaveProfile}
                isLoading={isSaving}
              >
                Save Changes
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Role & Permissions Section */}
      <Card variant="default">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Role & Permissions</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Account Role
              </label>
              <div className="flex items-center gap-3">
                <Badge
                  variant="primary"
                  className={roleColors[user?.role || 'SOC_ANALYST']}
                >
                  {user?.role || 'SOC_ANALYST'}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                {roleDescriptions[user?.role || 'SOC_ANALYST']}
              </p>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Note:</span> Contact your administrator to change your role.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Permissions Details */}
      <Card variant="default">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Your Permissions</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* View Permissions */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">View Access</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>✓ View all alerts and logs</li>
                <li>✓ View audit trail</li>
                <li>✓ Access quarantine list</li>
                <li>✓ View risk dashboards</li>
              </ul>
            </div>

            {/* Action Permissions */}
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-3">Investigation Access</h3>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>✓ Update alert status</li>
                <li>✓ Add investigation notes</li>
                <li>✓ Export data</li>
                <li>✓ Release quarantined emails</li>
              </ul>
            </div>

            {/* Admin Permissions */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-3">Admin Access</h3>
              <ul className="space-y-2 text-sm text-purple-800">
                {user?.role === 'SOC_ADMIN' ? (
                  <>
                    <li>✓ Manage users</li>
                    <li>✓ Configure policies</li>
                    <li>✓ System settings</li>
                    <li>✓ Delete data</li>
                  </>
                ) : (
                  <li className="text-gray-500">Not available with current role</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Section */}
      <Card variant="default">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Security</h2>

          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-semibold text-green-900">Active Session</p>
                <p className="text-sm text-green-700">You are currently logged in</p>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleLogout}
              className="w-full md:w-auto"
            >
              Logout
            </Button>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card variant="outlined">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">System Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Platform</p>
              <p className="font-semibold text-gray-900">Guardstone Console v1.0</p>
            </div>
            <div>
              <p className="text-gray-600">Environment</p>
              <p className="font-semibold text-gray-900">Production</p>
            </div>
            <div>
              <p className="text-gray-600">API Version</p>
              <p className="font-semibold text-gray-900">v2.0</p>
            </div>
            <div>
              <p className="text-gray-600">Last Sync</p>
              <p className="font-semibold text-gray-900">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Help & Support */}
      <Card variant="default">
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Help & Support</h2>
          <p className="text-gray-600">
            Need assistance? Contact your security administrator or refer to the documentation.
          </p>
          <Button variant="secondary" className="w-full md:w-auto">
            📖 View Documentation
          </Button>
        </div>
      </Card>
    </div>
  );
}
