import { ref, push, set, onValue, type Unsubscribe } from 'firebase/database';
import { db } from '@/core/config/firebase';
import type { CommentItem, CreateCommentDTO } from '@/types/comment.types';
import type { UserProfile } from '@/types/auth.types';

export function subscribeComments(
  requestId: string,
  callback: (comments: CommentItem[]) => void,
): Unsubscribe {
  const commentsRef = ref(db, `comments/${requestId}`);
  return onValue(commentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = Object.values(snapshot.val()) as CommentItem[];
    // Chronological order (oldest first)
    callback(data.sort((a, b) => a.createdAt - b.createdAt));
  });
}

export async function addComment(
  dto: CreateCommentDTO,
  user: UserProfile,
): Promise<string> {
  if (!dto.body.trim()) {
    throw new Error('Comment cannot be empty.');
  }
  if (dto.body.trim().length > 1000) {
    throw new Error('Comment cannot exceed 1000 characters.');
  }

  const commentsRef = ref(db, `comments/${dto.requestId}`);
  const newRef = push(commentsRef);
  const id = newRef.key!;

  const comment: CommentItem = {
    id,
    requestId:  dto.requestId,
    authorUid:  user.uid,
    authorName: user.displayName || 'User',
    authorRole: user.role,
    body:       dto.body.trim(),
    createdAt:  Date.now(),
  };

  await set(newRef, comment);
  return id;
}
