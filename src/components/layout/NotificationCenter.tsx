import React, { useEffect, useState } from 'react';
import { Bell, Mail, Phone, CheckCircle, Clock, X } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { subscribeUserNotifications, type AppNotification } from '@/services/notification.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function NotificationCenter() {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userProfile?.uid) return;
    return subscribeUserNotifications(userProfile.uid, (data) => {
      setNotifications(data);
    });
  }, [userProfile?.uid]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-xl text-muted hover:text-white hover:bg-surface-700 transition-colors cursor-pointer"
        aria-label="View notifications"
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notification Drawer Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Email & SMS Dispatch Center 📲"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Real-time record of automated Email and SMS notifications dispatched to your registered email (<strong>{userProfile?.email}</strong>) and phone (<strong>{userProfile?.phone || 'SMS Gateway'}</strong>).
          </p>

          {notifications.length === 0 ? (
            <div className="text-center py-10 bg-surface-700/30 rounded-xl border border-surface-600/40">
              <Bell size={32} className="text-muted mx-auto mb-2 opacity-60" />
              <p className="text-slate-200 font-medium text-sm">No Notifications Yet</p>
              <p className="text-xs text-muted mt-1">
                Dispatched Email & SMS alerts for request updates will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 bg-surface-700/60 rounded-xl border border-surface-600/60 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white text-sm flex items-center gap-1.5">
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-muted font-mono whitespace-nowrap">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-600/40 text-[11px] text-muted">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-brand-400">
                        <Mail size={12} /> Email Dispatched
                      </span>
                      <span className="flex items-center gap-1 text-info">
                        <Phone size={12} /> SMS Dispatched
                      </span>
                    </div>

                    <span className="text-success font-semibold flex items-center gap-1">
                      <CheckCircle size={12} /> Delivered
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close Inbox
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
