'use client';

import React, { useMemo } from 'react';
import TopSendersWidget from './TopSendersWidget';
import RiskTimelineWidget from './RiskTimelineWidget';
import ThreatPatternsWidget from './ThreatPatternsWidget';
import AnomalyAlertsWidget from './AnomalyAlertsWidget';
import RiskDistributionWidget from './RiskDistributionWidget';
import MLPredictionsWidget from './MLPredictionsWidget';
import UserActivityWidget from './UserActivityWidget';
import { Widget } from '@/types/widgets';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

interface WidgetGridProps {
  widgets: Widget[];
  onRemoveWidget?: (widgetId: string) => void;
  onEditWidget?: (widget: Widget) => void;
  editMode?: boolean;
}

const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'top-senders': TopSendersWidget,
  'risk-timeline': RiskTimelineWidget,
  'threat-patterns': ThreatPatternsWidget,
  'anomaly-alerts': AnomalyAlertsWidget,
  'risk-distribution': RiskDistributionWidget,
  'ml-predictions': MLPredictionsWidget,
  'user-activity': UserActivityWidget,
};

export default function WidgetGrid({
  widgets,
  onRemoveWidget,
  onEditWidget,
  editMode = false,
}: WidgetGridProps) {
  // Calculate grid column count based on widget sizes
  const getGridColspan = (size: string): number => {
    switch (size) {
      case 'small':
        return 1;
      case 'medium':
        return 2;
      case 'large':
        return 3;
      case 'full':
        return 4;
      default:
        return 1;
    }
  };

  // Sort widgets by position
  const sortedWidgets = useMemo(() => {
    return [...widgets]
      .filter((w) => w.isActive)
      .sort((a, b) => {
        const aRow = a.position?.row || 0;
        const bRow = b.position?.row || 0;
        if (aRow !== bRow) return aRow - bRow;
        return (a.position?.col || 0) - (b.position?.col || 0);
      });
  }, [widgets]);

  if (sortedWidgets.length === 0) {
    return (
      <Card variant="elevated" className="text-center py-12">
        <p className="text-2xl mb-2">📊</p>
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Widgets Selected</h3>
        <p className="text-gray-600 mb-4">
          Add widgets to customize your dashboard view
        </p>
        <Button variant="primary">Add Widget</Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 auto-rows-max">
      {sortedWidgets.map((widget) => {
        const Component = WIDGET_COMPONENTS[widget.type];
        const colspan = getGridColspan(widget.size);

        if (!Component) {
          return null;
        }

        return (
          <div
            key={widget.id}
            className={`col-span-${colspan} ${editMode ? 'border-2 border-dashed border-blue-400' : ''}`}
          >
            <div className={`relative ${editMode ? 'group' : ''}`}>
              <Component
                onRefresh={() => {}}
                lastRefreshed={widget.lastRefreshed}
              />

              {editMode && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditWidget?.(widget)}
                    className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
                    title="Edit widget"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onRemoveWidget?.(widget.id)}
                    className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Remove widget"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
