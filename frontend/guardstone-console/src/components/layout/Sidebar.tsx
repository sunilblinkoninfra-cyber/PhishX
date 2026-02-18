/**
 * Sidebar Component
 * Main navigation sidebar with risk-level routing
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks';
import { useUI } from '@/hooks';
import { Button } from '@/components/common';
import { getRiskLevelColor } from '@/utils/formatters';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useUI();

  const navigation = [
    { label: 'COLD (Logs)', href: '/logs', icon: '📋', color: 'blue' },
    { label: 'WARM (Alerts)', href: '/alerts', icon: '⚠️', color: 'yellow' },
    { label: 'HOT (Quarantine)', href: '/quarantine', icon: '🔥', color: 'red' },
    { label: 'Audit Trail', href: '/audit', icon: '📝', color: 'gray' },
    { label: 'Settings', href: '/settings', icon: '⚙️', color: 'gray' },
  ];

  const isActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          ☰
        </Button>
      </div>

      {/* Overlay (mobile) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h1 className="text-xl font-bold">Guardstone</h1>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-400 hover:text-white"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                // Close sidebar on mobile after navigation
                if (window.innerWidth < 1024) {
                  toggleSidebar();
                }
              }}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        {user && (
          <div className="border-t border-gray-700 px-6 py-4">
            <div className="mb-4">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="truncate font-medium text-white">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                Role: {user.role.replace('_', ' ')}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-700 px-6 py-3 text-xs text-gray-500">
          Guardstone Console v1.0.0
        </div>
      </aside>
    </>
  );
}
