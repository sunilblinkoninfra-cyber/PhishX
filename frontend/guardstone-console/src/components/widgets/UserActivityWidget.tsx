'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { UserActivityData } from '@/types/widgets';

interface UserActivityWidgetProps {
  onRefresh?: () => void;
  lastRefreshed?: Date;
}

export default function UserActivityWidget({
  onRefresh,
  lastRefreshed,
}: UserActivityWidgetProps) {
  const [data, setData] = useState<UserActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setData({
        users: [
          {
            email: 'john.smith@company.com',
            actionsCount: 342,
            lastAction: new Date(Date.now() - 300000),
            role: 'SOC_ANALYST',
          },
          {
            email: 'sarah.johnson@company.com',
            actionsCount: 287,
            lastAction: new Date(Date.now() - 600000),
            role: 'SOC_ANALYST',
          },
          {
            email: 'admin@company.com',
            actionsCount: 156,
            lastAction: new Date(Date.now() - 3600000),
            role: 'SOC_ADMIN',
          },
          {
            email: 'auditor@company.com',
            actionsCount: 42,
            lastAction: new Date(Date.now() - 86400000),
            role: 'AUDITOR',
          },
        ],
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <Card variant="default" className="flex items-center justify-center min-h-64">
        <LoadingSpinner />
      </Card>
    );
  }

  const roleColor = {
    SOC_ANALYST: 'info',
    SOC_ADMIN: 'primary',
    AUDITOR: 'success',
  } as const;

  return (
    <Card variant="default">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">👥 User Activity Today</h3>
          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              Updated {Math.round((Date.now() - lastRefreshed.getTime()) / 1000)}s ago
            </span>
          )}
        </div>

        <div className="space-y-2">
          {data?.users.map((user) => (
            <div
              key={user.email}
              className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.email.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <Badge variant={roleColor[user.role as keyof typeof roleColor]} size="sm">
                  {user.role.split('_')[0]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{user.actionsCount} actions</span>
                <span>
                  {Math.round((Date.now() - user.lastAction.getTime()) / 60000)} min ago
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
