"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-y-auto bg-background w-full">
          <main className="flex-1 p-6  justify-center items-center">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

