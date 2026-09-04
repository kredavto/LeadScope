import { AlertTriangle } from "lucide-react";
import type { Section } from "@/lib/section-data";
import { AppShell } from "./app-shell";
import { DataExplorer } from "./data-explorer";
import { SectionAction } from "./section-action";

export function SectionPage({ section, sectionKey }: { section: Section; sectionKey: string }) {
  return (
    <AppShell>
      <div className="page-head">
        <div><div className="eyebrow">{section.eyebrow}</div><h1>{section.title}</h1><p className="subtitle">{section.description}</p></div>
        <SectionAction sectionKey={sectionKey} label={section.action} />
      </div>
      {section.notice ? <div className="notice"><AlertTriangle size={16} />{section.notice}</div> : null}
      <DataExplorer section={section} />
    </AppShell>
  );
}
