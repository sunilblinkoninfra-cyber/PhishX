/**
 * Toast Notification Component
 * Display notifications with different types
 */

'use client';

import { useUI } from '@/hooks';

export function ToastContainer() {
  const notifications = useUI().notifications;
  const removeNotification = useUI().removeNotification;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

interface ToastProps {
  notification: any;
  onClose: () => void;
}

function Toast({ notification, onClose }: ToastProps) {
  const typeStyles = {
    success:
      'bg-green-100 text-green-900 border-green-300 border-l-4 border-l-green-600',
    error:
      'bg-red-100 text-red-900 border-red-300 border-l-4 border-l-red-600',
    info: 'bg-blue-100 text-blue-900 border-blue-300 border-l-4 border-l-blue-600',
    warning:
      'bg-yellow-100 text-yellow-900 border-yellow-300 border-l-4 border-l-yellow-600',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    info: 'ⓘ',
    warning: '⚠',
  };

  const style =
    typeStyles[notification.type as keyof typeof typeStyles] ||
    typeStyles.info;
  const icon = typeIcons[notification.type as keyof typeof typeIcons] || 'ⓘ';

  return (
    <div
      className={`animate-in fade-in slide-in-from-right-full rounded border bg-white px-4 py-3 shadow-lg ${style}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" aria-hidden="true">
            {icon}
          </span>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-current opacity-70 hover:opacity-100"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
