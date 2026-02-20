import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from '../ui';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function MainLayout({
  children,
  title,
  subtitle,
  headerActions,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header title={title} subtitle={subtitle} actions={headerActions} />
        
        <div className="px-6 py-2 bg-gray-100 dark:bg-gray-900 relative z-10">
          <Breadcrumbs />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
