'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import { useAlertStore } from '@/store/alertStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { APIClient } from '@/services/apiClient';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const { alerts, setAlerts, logs, setLogs } = useAlertStore();

  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    totalAlerts: 0,
    hotCount: 0,
    warmCount: 0,
    coldCount: 0,
    todayAlerts: 0,
  });

  // Calculate statistics
  React.useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [alertsRes, logsRes] = await Promise.all([
          APIClient.alerts.list({ limit: 100, offset: 0 }),
          APIClient.logs.list({ limit: 100, offset: 0 }),
        ]);

        setAlerts(alertsRes.items);
        setLogs(logsRes.items);

        // Calculate stats
        const allAlerts = [...alertsRes.items, ...logsRes.items];
        const hotCount = alertsRes.items.filter((a) => a.riskLevel === 'HOT').length;
        const warmCount = alertsRes.items.filter((a) => a.riskLevel === 'WARM').length;
        const coldCount = logsRes.items.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayAlerts = allAlerts.filter(
          (a) => new Date(a.timestamp) >= today
        ).length;

        setStats({
          totalAlerts: allAlerts.length,
          hotCount,
          warmCount,
          coldCount,
          todayAlerts,
        });

        addToast('Dashboard data loaded', 'success');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load dashboard';
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [setAlerts, setLogs, addToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.name || user?.email || 'User'}
        </h1>
        <p className="text-gray-600">
          Security Overview & Quick Actions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card variant="elevated">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalAlerts}</p>
            <p className="text-xs text-gray-500 pt-2">In system</p>
          </div>
        </Card>

        <Card variant="elevated" className="border-red-200">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">🔴 Critical</p>
            <p className="text-3xl font-bold text-red-600">{stats.hotCount}</p>
            <p className="text-xs text-red-500 pt-2">Require immediate action</p>
          </div>
        </Card>

        <Card variant="elevated" className="border-yellow-200">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">🟡 Active</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.warmCount}</p>
            <p className="text-xs text-yellow-500 pt-2">Need investigation</p>
          </div>
        </Card>

        <Card variant="elevated" className="border-blue-200">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">🔵 Informational</p>
            <p className="text-3xl font-bold text-blue-600">{stats.coldCount}</p>
            <p className="text-xs text-blue-500 pt-2">Activity logs</p>
          </div>
        </Card>

        <Card variant="elevated" className="border-purple-200">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">📊 Today</p>
            <p className="text-3xl font-bold text-purple-600">{stats.todayAlerts}</p>
            <p className="text-xs text-purple-500 pt-2">New detections</p>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="default">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">🔴 Quarantine</h3>
              <p className="text-sm text-gray-600">
                {stats.hotCount} critical emails awaiting action
              </p>
            </div>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => router.push('/quarantine')}
            >
              Review Quarantine
            </Button>
          </div>
        </Card>

        <Card variant="default">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">🟡 Alerts</h3>
              <p className="text-sm text-gray-600">
                {stats.warmCount} active alerts to investigate
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push('/alerts')}
            >
              Investigate Alerts
            </Button>
          </div>
        </Card>

        <Card variant="default">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">📋 Audit Trail</h3>
              <p className="text-sm text-gray-600">
                View all actions and investigations
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push('/audit')}
            >
              View Audit Log
            </Button>
          </div>
        </Card>
      </div>

      {/* Status & Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="default">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                <span className="text-sm text-gray-700">API Connection</span>
                <Badge variant="success">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                <span className="text-sm text-gray-700">WebSocket</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                <span className="text-sm text-gray-700">Database</span>
                <Badge variant="success">Online</Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Your Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Email</span>
                <span className="font-semibold text-gray-900">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role</span>
                <Badge variant="primary">{user?.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Active</span>
                <span className="font-semibold text-gray-900">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Risk Trend */}
      <Card variant="default">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Risk Distribution</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700">Critical (HOT)</span>
                <span className="text-sm font-semibold text-red-600">{stats.hotCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-red-500"
                  style={{
                    width: `${
                      stats.totalAlerts > 0
                        ? (stats.hotCount / stats.totalAlerts) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700">Active (WARM)</span>
                <span className="text-sm font-semibold text-yellow-600">{stats.warmCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-yellow-500"
                  style={{
                    width: `${
                      stats.totalAlerts > 0
                        ? (stats.warmCount / stats.totalAlerts) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700">Informational (COLD)</span>
                <span className="text-sm font-semibold text-blue-600">{stats.coldCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{
                    width: `${
                      stats.totalAlerts > 0
                        ? (stats.coldCount / stats.totalAlerts) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

