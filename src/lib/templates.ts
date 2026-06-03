import type { DocType } from "./types";

export interface Template {
  key: "folder" | "blank";
  label: string;
  description: string;
  type: DocType;
  icon: string;
  content: string;
}

export const TEMPLATES: Template[] = [
  {
    key: "folder",
    label: "Folder",
    description: "Group child documents in the sidebar",
    type: "folder",
    icon: "lucide:folder",
    content: "",
  },
  {
    key: "blank",
    label: "Blank Document",
    description: "Blank page — paste HTML source",
    type: "doc",
    icon: "lucide:file-text",
    content: "",
  },
];

export const DEFAULT_TEMPLATE_KEY: Template["key"] = "blank";

export function getTemplate(key: string): Template | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
