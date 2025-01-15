"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden min-w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-y-auto bg-background">
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

