'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Badge from '@/components/common/Badge';
import Toggle from '@/components/common/Toggle';

interface DashboardSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  compactView: boolean;
  showNotifications: boolean;
  defaultTemplate: string;
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  language: string;
}

interface VisualizationSettings {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  pointLabels: boolean;
  legend: boolean;
  gridLines: boolean;
  tooltipDelay: number;
}

export default function AdvancedSettingsPage() {
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>({
    autoRefresh: true,
    refreshInterval: 300,
    compactView: false,
    showNotifications: true,
    defaultTemplate: 'investigation',
    theme: 'auto',
    timezone: 'UTC',
    language: 'en',
  });

  const [vizSettings, setVizSettings] = useState<VisualizationSettings>({
    chartType: 'bar',
    pointLabels: true,
    legend: true,
    gridLines: true,
    tooltipDelay: 200,
  });

  const [saved, setSaved] = useState(false);

  const handleSaveDashboard = () => {
    localStorage.setItem('dashboardSettings', JSON.stringify(dashboardSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveViz = () => {
    localStorage.setItem('vizSettings', JSON.stringify(vizSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <PageLayout
      title="Advanced Settings"
      description="Configure dashboard behavior and visualization preferences"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Saved Notification */}
        {saved && (
          <Card variant="success" className="bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <p className="text-sm font-semibold text-green-900">Settings saved successfully</p>
            </div>
          </Card>
        )}

        {/* Dashboard Settings */}
        <Card variant="default">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dashboard Settings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure how your dashboard behaves and refreshes
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-6">
              {/* Auto Refresh */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Auto Refresh</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically refresh all widgets at regular intervals
                  </p>
                </div>
                <Toggle
                  enabled={dashboardSettings.autoRefresh}
                  onChange={(autoRefresh) =>
                    setDashboardSettings({ ...dashboardSettings, autoRefresh })
                  }
                />
              </div>

              {/* Refresh Interval */}
              {dashboardSettings.autoRefresh && (
                <div className="ml-12">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Refresh Interval (seconds)
                  </label>
                  <select
                    value={dashboardSettings.refreshInterval}
                    onChange={(e) =>
                      setDashboardSettings({
                        ...dashboardSettings,
                        refreshInterval: parseInt(e.target.value),
                      })
                    }
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value={60}>Every 1 minute</option>
                    <option value={300}>Every 5 minutes</option>
                    <option value={600}>Every 10 minutes</option>
                    <option value={1800}>Every 30 minutes</option>
                    <option value={3600}>Every 1 hour</option>
                  </select>
                </div>
              )}

              {/* Compact View */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Compact View</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Show more widgets on screen by reducing padding
                  </p>
                </div>
                <Toggle
                  enabled={dashboardSettings.compactView}
                  onChange={(compactView) =>
                    setDashboardSettings({ ...dashboardSettings, compactView })
                  }
                />
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Desktop Notifications</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Show browser notifications for critical alerts
                  </p>
                </div>
                <Toggle
                  enabled={dashboardSettings.showNotifications}
                  onChange={(showNotifications) =>
                    setDashboardSettings({ ...dashboardSettings, showNotifications })
                  }
                />
              </div>

              {/* Default Template */}
              <div className="pt-6 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Default Template
                </label>
                <select
                  value={dashboardSettings.defaultTemplate}
                  onChange={(e) =>
                    setDashboardSettings({
                      ...dashboardSettings,
                      defaultTemplate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="investigation">Investigation Template</option>
                  <option value="response">Response Playbook</option>
                  <option value="report">Report Template</option>
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  Used when creating new cases or incidents
                </p>
              </div>

              {/* Theme */}
              <div className="pt-6 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Theme
                </label>
                <select
                  value={dashboardSettings.theme}
                  onChange={(e) =>
                    setDashboardSettings({
                      ...dashboardSettings,
                      theme: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="auto">Auto (System)</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              {/* Timezone */}
              <div className="pt-6 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Timezone
                </label>
                <select
                  value={dashboardSettings.timezone}
                  onChange={(e) =>
                    setDashboardSettings({
                      ...dashboardSettings,
                      timezone: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Standard Time (EST)</option>
                  <option value="CST">Central Standard Time (CST)</option>
                  <option value="MST">Mountain Standard Time (MST)</option>
                  <option value="PST">Pacific Standard Time (PST)</option>
                </select>
              </div>
            </div>

            <Button variant="primary" onClick={handleSaveDashboard}>
              Save Dashboard Settings
            </Button>
          </div>
        </Card>

        {/* Visualization Settings */}
        <Card variant="default">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Visualization Preferences</h2>
              <p className="text-sm text-gray-600 mt-1">
                Customize how charts and graphs are displayed
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-6">
              {/* Chart Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Default Chart Type
                </label>
                <div className="flex flex-wrap gap-3">
                  {(['bar', 'line', 'pie', 'area'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setVizSettings({ ...vizSettings, chartType: type })}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                        vizSettings.chartType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Point Labels */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Show Point Labels</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Display values at data points on charts
                  </p>
                </div>
                <Toggle
                  enabled={vizSettings.pointLabels}
                  onChange={(pointLabels) =>
                    setVizSettings({ ...vizSettings, pointLabels })
                  }
                />
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Show Legend</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Display legend for chart series
                  </p>
                </div>
                <Toggle
                  enabled={vizSettings.legend}
                  onChange={(legend) =>
                    setVizSettings({ ...vizSettings, legend })
                  }
                />
              </div>

              {/* Grid Lines */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div>
                  <h3 className="font-semibold text-gray-900">Show Grid Lines</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Display background grid on charts
                  </p>
                </div>
                <Toggle
                  enabled={vizSettings.gridLines}
                  onChange={(gridLines) =>
                    setVizSettings({ ...vizSettings, gridLines })
                  }
                />
              </div>

              {/* Tooltip Delay */}
              <div className="pt-6 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tooltip Delay (milliseconds)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={vizSettings.tooltipDelay}
                  onChange={(e) =>
                    setVizSettings({
                      ...vizSettings,
                      tooltipDelay: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-2">
                  Current: {vizSettings.tooltipDelay}ms
                </p>
              </div>
            </div>

            <Button variant="primary" onClick={handleSaveViz}>
              Save Visualization Settings
            </Button>
          </div>
        </Card>

        {/* Data Export Settings */}
        <Card variant="default">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Data & Export</h2>
              <p className="text-sm text-gray-600 mt-1">
                Export your dashboard configuration and data
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-3">
              <Button variant="secondary" className="w-full">
                📥 Export Widget Configuration
              </Button>
              <Button variant="secondary" className="w-full">
                📥 Export Dashboard Data
              </Button>
              <Button variant="secondary" className="w-full">
                📥 Export All Templates
              </Button>
            </div>
          </div>
        </Card>

        {/* Advanced Options */}
        <Card variant="default">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Advanced Options</h2>
              <p className="text-sm text-gray-600 mt-1">
                Advanced configuration for power users
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 space-y-3">
              <Button variant="secondary" className="w-full justify-start">
                🧹 Clear Cache
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                ↺ Reset to Default Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start text-red-600">
                ⚠️ Clear All Dashboard Data
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
