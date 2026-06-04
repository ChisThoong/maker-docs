export type DocStatus =
  | "concept"
  | "in_dev"
  | "review"
  | "locked"
  | "shipped"
  | "tbd";

export type DocType =
  | "folder"
  | "hero"
  | "skill"
  | "mechanic"
  | "feature"
  | "doc";

export type ContentMode = "html" | "markdown" | "url" | "file";

export type FileKind =
  | "image"
  | "pdf"
  | "video"
  | "audio"
  | "office"
  | "other";

export interface DocFileMeta {
  url: string;
  name: string;
  size: number;
  mimeType: string;
  kind: FileKind;
  uploadedAt?: string;
}

/** "inherit" follows the parent; "restricted" hides the subtree from everyone
 * except explicit grantees, the owner, and workspace admins. */
export type DocVisibility = "inherit" | "restricted";

export interface DocMeta {
  id: string;
  title: string;
  subtitle?: string;
  type: DocType;
  parentId: string | null;
  order: number;
  status: DocStatus;
  icon: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  visibility?: DocVisibility;
}

export interface Doc extends DocMeta {
  content: string;
  contentMode: ContentMode;
  file?: DocFileMeta | null;
  publicId?: string | null;
}

export type StatusTone =
  | "slate"
  | "green"
  | "orange"
  | "blue"
  | "teal"
  | "red";

export const STATUS_ORDER: DocStatus[] = [
  "concept",
  "in_dev",
  "review",
  "locked",
  "shipped",
  "tbd",
];

export const STATUS_META: Record<
  DocStatus,
  { label: string; description: string; tone: StatusTone; dot: string }
> = {
  concept: {
    label: "Concept",
    description: "Early idea or draft. Content can change freely.",
    tone: "slate",
    dot: "bg-slate-400",
  },
  in_dev: {
    label: "In Development",
    description: "Actively being written or updated.",
    tone: "orange",
    dot: "bg-orange-500",
  },
  review: {
    label: "In Review",
    description: "Ready for feedback or approval from the team.",
    tone: "blue",
    dot: "bg-sky-500",
  },
  locked: {
    label: "Design Locked",
    description: "Approved and frozen. Changes need explicit sign-off.",
    tone: "green",
    dot: "bg-emerald-500",
  },
  shipped: {
    label: "Shipped",
    description: "Live in the game or published as final reference.",
    tone: "teal",
    dot: "bg-teal-500",
  },
  tbd: {
    label: "TBD",
    description: "Status not decided yet.",
    tone: "red",
    dot: "bg-rose-500",
  },
};

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  slate:
    "bg-slate-100 text-slate-600 ring-slate-200/70 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20",
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20",
  orange:
    "bg-orange-50 text-orange-700 ring-orange-200/70 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/20",
  blue:
    "bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/20",
  teal:
    "bg-teal-50 text-teal-700 ring-teal-200/70 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-400/20",
  red:
    "bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20",
};

export const TYPE_META: Record<DocType, { label: string; icon: string }> = {
  folder: { label: "Folder", icon: "lucide:folder" },
  hero: { label: "Hero / Character", icon: "lucide:user-round" },
  skill: { label: "Skill / Ability", icon: "lucide:zap" },
  mechanic: { label: "Mechanic / System", icon: "lucide:settings" },
  feature: { label: "Feature", icon: "lucide:target" },
  doc: { label: "Document", icon: "lucide:file-text" },
};
