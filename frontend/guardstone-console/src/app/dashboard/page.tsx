'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import { WidgetGrid, WidgetLibrary } from '@/components/widgets';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { Widget } from '@/types/widgets';

export default function AnalyticsDashboardPage() {
  const [editMode, setEditMode] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState<Widget[]>([
    // Initialize with default widgets
    {
      id: 'widget-1',
      type: 'risk-distribution',
      title: 'Risk Distribution',
      size: 'medium',
      position: { row: 0, col: 0 },
      refreshInterval: 300000,
      customization: {},
      isActive: true,
      lastRefreshed: new Date().toISOString(),
    },
    {
      id: 'widget-2',
      type: 'risk-timeline',
      title: 'Risk Timeline',
      size: 'large',
      position: { row: 0, col: 2 },
      refreshInterval: 300000,
      customization: {},
      isActive: true,
      lastRefreshed: new Date().toISOString(),
    },
    {
      id: 'widget-3',
      type: 'top-senders',
      title: 'Top Suspicious Senders',
      size: 'medium',
      position: { row: 1, col: 0 },
      refreshInterval: 300000,
      customization: {},
      isActive: true,
      lastRefreshed: new Date().toISOString(),
    },
    {
      id: 'widget-4',
      type: 'threat-patterns',
      title: 'Threat Patterns',
      size: 'medium',
      position: { row: 1, col: 2 },
      refreshInterval: 300000,
      customization: {},
      isActive: true,
      lastRefreshed: new Date().toISOString(),
    },
    {
      id: 'widget-5',
      type: 'ml-predictions',
      title: 'ML Predictions',
      size: 'large',
      position: { row: 2, col: 0 },
      refreshInterval: 600000,
      customization: {},
      isActive: true,
      lastRefreshed: new Date().toISOString(),
    },
    {
      id: 'widget-6',
      type: 'anomaly-alerts',
      title: 'Anomaly Alerts',
      size: 'medium',
      position: { row: 2, col: 2 },
      refreshInterval: 300000,
      customization: {},
      isActive: true,
      lastRefreshed: new Date().toISOString(),
    },
    {
      id: 'widget-7',
      type: 'user-activity',
      title: 'User Activity',
      size: 'medium',
      position: { row: 3, col: 0 },
      refreshInterval: 600000,
      customization: {},
      isActive: true,
      lastRefreshed: new Date().toISOString(),
    },
  ]);

  const handleAddWidget = (widgetType: string) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widgetType as any,
      title: widgetType.replace(/-/g, ' '),
      size: 'medium',
      position: { row: 0, col: 0 },
      refreshInterval: 300000,
      customization: {},
      isActive: true,
      lastRefreshed: new Date().toISOString(),
    };

    setSelectedWidgets([...selectedWidgets, newWidget]);
  };

  const handleRemoveWidget = (widgetId: string) => {
    setSelectedWidgets(selectedWidgets.filter((w) => w.id !== widgetId));
  };

  const handleRefreshAll = () => {
    setSelectedWidgets(
      selectedWidgets.map((w) => ({
        ...w,
        lastRefreshed: new Date().toISOString(),
      }))
    );
  };

  return (
    <PageLayout
      title="Analytics Dashboard"
      description="Comprehensive threat analytics and insights"
    >
      <div className="space-y-6">
        {/* Header with Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {selectedWidgets.length} widgets active
            </p>
          </div>
          <div className="flex gap-3">
            {editMode && (
              <Button variant="secondary" onClick={() => setEditMode(false)}>
                Done Editing
              </Button>
            )}
            {!editMode && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleRefreshAll}
                  title="Refresh all widgets"
                >
                  🔄 Refresh All
                </Button>
                <Button variant="secondary" onClick={() => setEditMode(true)}>
                  ⚙️ Customize
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Edit Mode Info */}
        {editMode && (
          <Card variant="info" className="bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div>
                <h3 className="font-semibold text-gray-900">Customize Your Dashboard</h3>
                <p className="text-sm text-gray-700 mt-1">
                  Add or remove widgets to personalize your analytics view. Use the widget
                  library on the right to discover and add new widgets.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Dashboard Grid */}
          <div className="lg:col-span-3">
            <Card variant="default" className="p-6 bg-gray-50 min-h-screen">
              {selectedWidgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <p className="text-4xl mb-4">📊</p>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No Widgets Added
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Get started by adding widgets from the library
                  </p>
                  <Button variant="primary" onClick={() => setEditMode(true)}>
                    Customize Dashboard
                  </Button>
                </div>
              ) : (
                <WidgetGrid
                  widgets={selectedWidgets}
                  editMode={editMode}
                  onRemoveWidget={handleRemoveWidget}
                />
              )}
            </Card>
          </div>

          {/* Widget Library Sidebar */}
          {editMode && (
            <div className="lg:col-span-1">
              <Card variant="default" className="sticky top-4">
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">Widget Library</h3>
                  <WidgetLibrary
                    selectedWidgets={selectedWidgets.map((w) => w.type)}
                    onAddWidget={handleAddWidget}
                  />
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Dashboard Stats */}
        <Card variant="default">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-blue-600">
                {selectedWidgets.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Active Widgets</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">
                {selectedWidgets.filter((w) => w.size === 'large').length +
                  selectedWidgets.filter((w) => w.size === 'full').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Large Widgets</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">
                {Math.max(...selectedWidgets.map((w) => w.position.row + 1), 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Dashboard Rows</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-600">
                {new Date().toLocaleTimeString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">Last Updated</p>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
