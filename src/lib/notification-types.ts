import type { AccessLevel } from "./acl";

export interface Notification {
  id: string;
  recipientEmail: string;
  type: "share";
  docId: string;
  docTitle: string;
  docPath: string;
  sharedByEmail: string;
  sharedByName: string;
  level: AccessLevel;
  read: boolean;
  createdAt: string;
}

export const LEVEL_LABEL: Record<AccessLevel, string> = {
  viewer: "View",
  commenter: "View",
  editor: "Edit",
  admin: "Admin",
};
