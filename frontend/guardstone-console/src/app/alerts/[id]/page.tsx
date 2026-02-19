'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DrillDownPage from '@/components/investigation/DrillDownPage';
import { useAlertStore } from '@/store/alertStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { APIClient } from '@/services/apiClient';
import { Alert, AlertStatus } from '@/types/api';

export default function AlertDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const alertId = params.id as string;

  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const { alerts, setAlerts } = useAlertStore();

  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch alert details
  useEffect(() => {
    const fetchAlert = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to find in local store first
        const existingAlert = alerts.find((a) => a.id === alertId);
        if (existingAlert) {
          setAlert(existingAlert);
          return;
        }

        // Fetch from API if not in store
        const response = await APIClient.alerts.getById(alertId);
        setAlert(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load alert';
        setError(message);
        addToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAlert();
  }, [alertId, alerts, addToast]);

  const handleStatusChange = async (newStatus: AlertStatus, notes: string) => {
    if (!alert) return;

    try {
      await APIClient.alerts.updateStatus(alertId, {
        status: newStatus,
        notes,
        changedBy: user?.id || 'unknown',
      });

      // Update local store
      const updatedAlerts = alerts.map((a) =>
        a.id === alertId ? { ...a, status: newStatus } : a
      );
      setAlerts(updatedAlerts);

      // Update local state
      setAlert({ ...alert, status: newStatus });

      addToast(`Alert status updated to ${newStatus}`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      addToast(message, 'error');
      throw err;
    }
  };

  const handleAddNote = async (alertIdParam: string, note: string) => {
    try {
      await APIClient.alerts.addNote(alertIdParam, {
        text: note,
        addedBy: user?.id || 'unknown',
      });

      addToast('Note added successfully', 'success');
      // Optionally refresh alert to show new note
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add note';
      addToast(message, 'error');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="space-y-6">
        <Card variant="default" className="border-red-200 bg-red-50">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-red-900 mb-2">Alert Not Found</h2>
            <p className="text-red-700 mb-4">
              {error || `Unable to load alert ${alertId}`}
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/alerts')}
            >
              ← Back to Alerts
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => router.push('/alerts')}
        >
          ← Back to Alerts
        </Button>
      </div>

      {/* Drill Down Page */}
      <DrillDownPage
        alert={alert}
        onStatusChange={handleStatusChange}
        onAddNote={handleAddNote}
        loading={loading}
      />
    </div>
  );
}
