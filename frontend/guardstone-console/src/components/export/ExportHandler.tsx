'use client';

import React, { useState, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { formatDate } from '@/utils/formatters';
import { ExportConfig } from './ExportModal';

interface ExportJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  format: string;
  count: number;
  progress: number; // 0-100
  createdAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  error?: string;
}

interface ExportHandlerProps {
  jobs?: ExportJob[];
  onRetry?: (jobId: string) => void;
  onDownload?: (jobId: string) => void;
  loading?: boolean;
}

const statusColors: Record<ExportJob['status'], string> = {
  PENDING: 'bg-gray-100 text-gray-900',
  PROCESSING: 'bg-blue-100 text-blue-900',
  COMPLETED: 'bg-green-100 text-green-900',
  FAILED: 'bg-red-100 text-red-900',
};

const statusIcons: Record<ExportJob['status'], string> = {
  PENDING: '⏳',
  PROCESSING: '⚙️',
  COMPLETED: '✅',
  FAILED: '❌',
};

export default function ExportHandler({
  jobs = [],
  onRetry,
  onDownload,
  loading = false,
}: ExportHandlerProps) {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const handleDownload = useCallback((jobId: string) => {
    if (onDownload) {
      onDownload(jobId);
    }
  }, [onDownload]);

  const handleRetry = useCallback((jobId: string) => {
    if (onRetry) {
      onRetry(jobId);
    }
  }, [onRetry]);

  if (jobs.length === 0) {
    return (
      <Card variant="default">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">📥 No export jobs yet</p>
          <p className="text-sm text-gray-400">Your export jobs will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Export Jobs</h3>
        <p className="text-sm text-gray-600">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="mt-4 space-y-2 divide-y divide-gray-200">
        {jobs.map((job) => (
          <div key={job.id} className="py-3 last:pb-0">
            {/* Job Header */}
            <div
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
              onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">{statusIcons[job.status]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {job.format} Export
                    </p>
                    <Badge variant={job.status === 'COMPLETED' ? 'success' : job.status === 'FAILED' ? 'error' : 'info'}>
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {job.count} alert{job.count !== 1 ? 's' : ''} • {formatDate(job.createdAt)}
                  </p>
                </div>
              </div>

              <button className="text-gray-400 hover:text-gray-600">
                {expandedJobId === job.id ? '▼' : '▶'}
              </button>
            </div>

            {/* Progress Bar */}
            {job.status === 'PROCESSING' && (
              <div className="mt-2 mb-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-600">Processing</p>
                  <p className="text-xs font-semibold text-gray-700">{job.progress}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Expanded Details */}
            {expandedJobId === job.id && (
              <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 p-3 rounded space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Job ID</p>
                    <p className="font-mono text-gray-900 truncate">{job.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Format</p>
                    <p className="font-semibold text-gray-900">{job.format}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Items</p>
                    <p className="font-semibold text-gray-900">{job.count}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-semibold text-gray-900">{job.status}</p>
                  </div>
                  {job.completedAt && (
                    <div className="col-span-2">
                      <p className="text-gray-600">Completed</p>
                      <p className="font-semibold text-gray-900">{formatDate(job.completedAt)}</p>
                    </div>
                  )}
                  {job.error && (
                    <div className="col-span-2">
                      <p className="text-gray-600">Error</p>
                      <p className="font-semibold text-red-600">{job.error}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {job.status === 'COMPLETED' && job.downloadUrl && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownload(job.id)}
                      disabled={loading}
                    >
                      📥 Download
                    </Button>
                  )}
                  {job.status === 'FAILED' && onRetry && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRetry(job.id)}
                      disabled={loading}
                    >
                      🔄 Retry
                    </Button>
                  )}
                  {job.status === 'PROCESSING' && (
                    <p className="text-sm text-gray-600">Exporting... {job.progress}%</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
