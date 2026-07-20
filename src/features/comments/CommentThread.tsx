import React, { useEffect, useState } from 'react';
import { Send, MessageSquare, Shield, User } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { subscribeComments, addComment } from '@/services/comment.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { CommentItem } from '@/types/comment.types';

interface CommentThreadProps {
  requestId: string;
}

export function CommentThread({ requestId }: CommentThreadProps) {
  const { userProfile } = useAuth();
  const { showError, showSuccess } = useToast();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return subscribeComments(requestId, (list) => {
      setComments(list);
    });
  }, [requestId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !userProfile) return;

    setSubmitting(true);
    try {
      await addComment({ requestId, body: text.trim() }, userProfile);
      setText('');
      showSuccess('Comment added.');
    } catch (err: any) {
      showError(err?.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-surface-700 pb-3">
        <MessageSquare size={18} className="text-brand-400" />
        <h3 className="font-display font-semibold text-base text-white">
          Comments & Discussion ({comments.length})
        </h3>
      </div>

      {/* Comment Feed */}
      {comments.length === 0 ? (
        <p className="text-xs text-muted text-center py-4 bg-surface-700/20 rounded-lg">
          No comments yet. Start the conversation below.
        </p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="p-3 bg-surface-700/50 rounded-xl border border-surface-600/40 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{c.authorName}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.2 rounded-full uppercase ${
                      c.authorRole === 'admin'
                        ? 'bg-danger/20 text-danger'
                        : c.authorRole === 'manager'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-surface-700 text-slate-300'
                    }`}
                  >
                    {c.authorRole}
                  </span>
                </div>
                <span className="text-muted text-[10px]">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <input
          type="text"
          placeholder="Add a comment to this request..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <Button variant="primary" size="sm" type="submit" loading={submitting} icon={<Send size={14} />}>
          Post
        </Button>
      </form>
    </div>
  );
}
