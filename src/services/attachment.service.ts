import { ref, push, set, onValue, type Unsubscribe } from 'firebase/database';
import { db } from '@/core/config/firebase';
import type { AttachmentItem, CreateAttachmentDTO } from '@/types/attachment.types';
import type { UserProfile } from '@/types/auth.types';

export function subscribeAttachments(
  requestId: string,
  callback: (attachments: AttachmentItem[]) => void,
): Unsubscribe {
  const attachmentsRef = ref(db, `attachments/${requestId}`);
  return onValue(attachmentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = Object.values(snapshot.val()) as AttachmentItem[];
    callback(data.sort((a, b) => b.createdAt - a.createdAt));
  });
}

export async function addAttachment(
  dto: CreateAttachmentDTO,
  user: UserProfile,
): Promise<string> {
  if (!dto.fileName.trim()) {
    throw new Error('File name is required.');
  }
  if (!dto.url.trim()) {
    throw new Error('Document URL is required.');
  }

  const attachmentsRef = ref(db, `attachments/${dto.requestId}`);
  const newRef = push(attachmentsRef);
  const id = newRef.key!;

  const attachment: AttachmentItem = {
    id,
    requestId:    dto.requestId,
    uploadedBy:   user.uid,
    uploaderName: user.displayName || 'User',
    fileName:     dto.fileName.trim(),
    fileType:     'document/link',
    fileSize:     0,
    url:          dto.url.trim(),
    description:  dto.description?.trim() || '',
    createdAt:    Date.now(),
  };

  await set(newRef, attachment);
  return id;
}
