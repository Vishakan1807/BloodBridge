import React, { useEffect, useState } from 'react';
import { Paperclip, Plus, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { subscribeAttachments, addAttachment } from '@/services/attachment.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { AttachmentItem } from '@/types/attachment.types';

interface AttachmentPanelProps {
  requestId: string;
}

export function AttachmentPanel({ requestId }: AttachmentPanelProps) {
  const { userProfile } = useAuth();
  const { showError, showSuccess } = useToast();
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return subscribeAttachments(requestId, (list) => {
      setAttachments(list);
    });
  }, [requestId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName.trim() || !url.trim() || !userProfile) return;

    setSubmitting(true);
    try {
      await addAttachment(
        {
          requestId,
          fileName: fileName.trim(),
          url: url.trim(),
          description: description.trim(),
        },
        userProfile,
      );
      setFileName('');
      setUrl('');
      setDescription('');
      setModalOpen(false);
      showSuccess('Attachment link added.');
    } catch (err: any) {
      showError(err?.message || 'Failed to add attachment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-surface-700 pb-3">
        <div className="flex items-center gap-2">
          <Paperclip size={18} className="text-brand-400" />
          <h3 className="font-display font-semibold text-base text-white">
            Medical Attachments ({attachments.length})
          </h3>
        </div>

        <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
          Add Link
        </Button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-muted text-center py-4 bg-surface-700/20 rounded-lg">
          No document attachments linked to this request.
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="p-3 bg-surface-700/50 rounded-xl border border-surface-600/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-brand-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-200">{att.fileName}</p>
                  {att.description && <p className="text-[11px] text-muted">{att.description}</p>}
                </div>
              </div>

              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300"
              >
                Open Link <ExternalLink size={12} />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Add Attachment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Link Medical Document / Prescription">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Document Name"
            placeholder="e.g. Doctor Prescription for O+ Blood"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
          />

          <Input
            label="Document URL"
            placeholder="https://drive.google.com/file/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Signed by Dr. Sharma"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Add Document Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
