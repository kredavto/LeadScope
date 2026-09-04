import { notFound } from "next/navigation";
import { SectionPage } from "@/components/section-page";
import { sections } from "@/lib/section-data";

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function DynamicSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: key } = await params;
  const section = sections[key];
  if (!section) notFound();
  return <SectionPage section={section} sectionKey={key} />;
}
