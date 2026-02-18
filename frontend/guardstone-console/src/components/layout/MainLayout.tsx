/**
 * Main Layout Component
 * Root layout wrapper combining sidebar, topbar, and content area
 */

'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ErrorBoundary } from '@/components/common';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  onSearch?: (query: string) => void;
}

export function MainLayout({
  children,
  title,
  onSearch,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar title={title} onSearch={onSearch} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
