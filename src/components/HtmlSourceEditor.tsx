"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import {
  githubDarkInit,
  githubLightInit,
} from "@uiw/codemirror-theme-github";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import "./html-source-editor.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  wrap?: boolean;
  className?: string;
  placeholder?: string;
}

const layoutTheme = EditorView.theme({
  ".cm-scroller": { overflow: "auto", lineHeight: "1.65" },
  ".cm-content": {
    fontSize: "13px",
    lineHeight: "1.65",
    padding: "1rem 1rem 1rem 0.5rem",
  },
  ".cm-gutters": { fontSize: "12px", lineHeight: "1.65" },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "2.75rem",
    paddingRight: "0.75rem",
    paddingLeft: "1rem",
  },
});

export default function HtmlSourceEditor({
  value,
  onChange,
  wrap = true,
  className,
  placeholder,
}: Props) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState<number>(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () => {
      const h = node.getBoundingClientRect().height;
      if (h > 0) setEditorHeight(Math.floor(h));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const theme = useMemo(() => {
    const init = resolvedTheme === "dark" ? githubDarkInit : githubLightInit;
    return init({
      settings: {
        background: "transparent",
        gutterBackground: "transparent",
        lineHighlight: "transparent",
        fontSize: "13px",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      },
    });
  }, [resolvedTheme]);

  const extensions = useMemo(() => {
    const exts: Extension[] = [html(), layoutTheme];
    if (wrap) exts.push(EditorView.lineWrapping);
    return exts;
  }, [wrap]);

  return (
    <div ref={containerRef} className={cn("html-cm-editor", className)}>
      {editorHeight > 0 && (
        <CodeMirror
          value={value}
          height={`${editorHeight}px`}
          className="html-cm-editor__cm"
          theme={theme}
          extensions={extensions}
          onChange={onChange}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            highlightSelectionMatches: false,
            searchKeymap: false,
          }}
        />
      )}
    </div>
  );
}
