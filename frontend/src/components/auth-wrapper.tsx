"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
 const pathname = usePathname()
 const router = useRouter()
 const [mounted, setMounted] = useState(false)
 const [isAuthenticated, setIsAuthenticated] = useState(false)

 useEffect(() => {
 setMounted(true)
 const token = localStorage.getItem("erp_token")
 const userStr = localStorage.getItem("erp_user")
 const user = userStr ? JSON.parse(userStr) : null
 if (token) {
 setIsAuthenticated(true)
 const isKasir = user?.role === "Kasir"
 if (pathname === "/login") {
 if (isKasir) { router.push("/pos/new-transaction") } else { router.push("/") }
 } else if (isKasir && !pathname.startsWith("/pos")) {
 router.push("/pos/new-transaction")
 }
 } else {
 setIsAuthenticated(false)
 if (pathname !== "/login") { router.push("/login") }
 }
 }, [pathname, router])

 if (!mounted) return null

 // Jika halaman login, jangan tampilkan Sidebar dan Header
 if (pathname === "/login") {
 return <main className="flex-1">{children}</main>
 }

 // Jika belum login dan bukan di halaman login, jangan render children (sedang redirect)
 if (!isAuthenticated) return null

  // POS Layout (Full screen, no sidebar)
  if (pathname.startsWith('/pos')) {
    return <main className="h-screen w-full bg-background overflow-hidden flex flex-col">{children}</main>
  }

 return (
 <SidebarProvider>
 <div className="print:hidden"><AppSidebar /></div>
 <div className="flex min-h-svh flex-1 flex-col overflow-hidden">
 <div className="print:hidden"><AppHeader /></div>
 <main className="flex-1 overflow-auto bg-background p-6 md:p-8 print:p-0 print:overflow-visible print:bg-white">
 <div className="mx-auto w-full print:max-w-none print:mx-0 print:w-full">
 {children}
 </div>
 </main>
 </div>
 </SidebarProvider>
 )
}

