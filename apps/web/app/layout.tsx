import type { Metadata, Viewport } from "next";
import { WorkspaceProvider } from "@/components/workspace-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LeadScope 2.0", template: "%s · LeadScope" },
  description: "Безопасная аналитика конкурентного спроса и разрешённых лидов B2C/B2B",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body><WorkspaceProvider>{children}</WorkspaceProvider></body>
    </html>
  );
}
