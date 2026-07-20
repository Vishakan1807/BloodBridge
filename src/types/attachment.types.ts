export interface AttachmentItem {
  id:           string;
  requestId:    string;
  uploadedBy:   string;
  uploaderName: string;
  fileName:     string;
  fileType:     string;
  fileSize:     number;
  url:          string;
  description:  string;
  createdAt:    number;
}

export interface CreateAttachmentDTO {
  requestId:   string;
  fileName:    string;
  url:         string;
  description: string;
}
