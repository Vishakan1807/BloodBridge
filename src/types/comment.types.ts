import type { Role } from '@/core/constants/roles';

export interface CommentItem {
  id:         string;
  requestId:  string;
  authorUid:  string;
  authorName: string;
  authorRole: Role;
  body:       string;
  createdAt:  number;
}

export interface CreateCommentDTO {
  requestId: string;
  body:      string;
}
