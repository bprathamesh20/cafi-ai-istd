"use client"

import { ClipboardList, BarChart2 } from 'lucide-react'
import { usePathname } from "next/navigation"
import { UserButton } from '@stackframe/stack';
import { useUser } from "@stackframe/stack"
import Logo from '@/assets/cafi-logo.svg'
import Link from "next/link"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const sidebarItems = [
  { icon: ClipboardList, label: "Interviews", href: "/dashboard" },
  { icon: BarChart2, label: "Results", href: "/dashboard/results" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const user = useUser();
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4 flex flex-row items-center">
        <Image src={Logo} alt="Cafi Logo" className="mr-1 h-8 w-8" width={32} height={32} />
        <h2 className="text-xl font-bold">cafi AI</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                  >
                    <Link href={item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/handler/account-settings#profile">
                    <UserButton />
                    {user?.displayName}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

