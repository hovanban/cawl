"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

const NO_SHELL_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noShell  = NO_SHELL_PATHS.some((p) => pathname.startsWith(p));

  if (noShell) return <div className="flex-1 flex items-center justify-center min-h-full">{children}</div>;

  return (
    <>
      <Sidebar />
      <main className="ml-56 flex-1 min-h-full overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </>
  );
}
