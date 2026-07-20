import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell() {
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main Area ────────────────────────────────────── */}
      <div className={[
        'flex flex-col flex-1 min-w-0 transition-all duration-200',
        'lg:ml-0',  // margin handled by sidebar width
      ].join(' ')}>
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main
          id="main-content"
          className="flex-1 p-6 page-enter overflow-auto"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
