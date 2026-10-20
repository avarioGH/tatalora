"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MonitorSmartphone, Receipt, Clock, Settings, Maximize, Lock, LogOut, User } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  
  useEffect(() => {
    const userStr = localStorage.getItem("erp_user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("erp_token")
    localStorage.removeItem("erp_user")
    window.location.href = "/login"
  }

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div className="flex h-screen w-full bg-muted/20 overflow-hidden">
      {/* Mini Sidebar */}
      <aside className="w-[60px] md:w-[80px] bg-card border-r border-border flex flex-col items-center py-4 md:py-6 gap-4 md:gap-6 z-20 shadow-sm shrink-0">
        
        {/* App Logo */}
        <Link href="/" className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-md hover:bg-indigo-700 transition-colors" title="Kembali ke Dashboard">
          T
        </Link>
        
        {/* Nav Items */}
        <div className="flex flex-col gap-4 w-full px-2">
          <Link href="/pos/new-transaction" className="group flex flex-col items-center gap-1">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${pathname === '/pos/new-transaction' ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20' : 'text-muted-foreground group-hover:bg-muted'}`}>
              <MonitorSmartphone className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className={`text-[9px] md:text-[10px] ${pathname === '/pos/new-transaction' ? 'font-semibold text-indigo-600' : 'font-medium text-muted-foreground'}`}>Kasir</span>
          </Link>
          
          <Link href="/pos/order-history" className="group flex flex-col items-center gap-1">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${pathname.startsWith('/pos/order-history') ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20' : 'text-muted-foreground group-hover:bg-muted'}`}>
              <Receipt className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className={`text-[9px] md:text-[10px] ${pathname.startsWith('/pos/order-history') ? 'font-semibold text-indigo-600' : 'font-medium text-muted-foreground'}`}>Transaksi</span>
          </Link>
          
          <Link href="/pos/shift" className="group flex flex-col items-center gap-1">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${pathname.startsWith('/pos/shift') ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20' : 'text-muted-foreground group-hover:bg-muted'}`}>
              <Clock className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className={`text-[9px] md:text-[10px] ${pathname.startsWith('/pos/shift') ? 'font-semibold text-indigo-600' : 'font-medium text-muted-foreground'}`}>Shift</span>
          </Link>
        </div>
        
        <div className="mt-auto flex flex-col gap-4 w-full px-2">
          <Link href="/pos/settings" className="group flex flex-col items-center gap-1">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${pathname.startsWith('/pos/settings') ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20' : 'text-muted-foreground group-hover:bg-muted'}`}>
              <Settings className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className={`text-[9px] md:text-[10px] ${pathname.startsWith('/pos/settings') ? 'font-semibold text-indigo-600' : 'font-medium text-muted-foreground'}`}>Pengaturan</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full overflow-hidden">
        
        {/* POS Header */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
          <div>
            <h2 className="font-semibold text-sm text-foreground">Welcome, {user?.name || 'Kasir'}</h2>
            <p className="text-xs text-muted-foreground">Default Outlet</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            
            <DropdownMenu>
              
                <DropdownMenuTrigger className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors border border-border outline-none">
                  <User className="w-4 h-4 text-foreground" />
                </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium">{user?.name || 'Kasir'}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleFullScreen} className="cursor-pointer">
                  <Maximize className="w-4 h-4 mr-2" /> Layar Penuh
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Lock className="w-4 h-4 mr-2" /> Kunci Layar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <Link href="/pos/shift">
                  <DropdownMenuItem className="cursor-pointer text-indigo-600 focus:text-indigo-600 font-medium">
                    <Clock className="w-4 h-4 mr-2" /> Tutup Shift
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-rose-600 focus:text-rose-600 font-medium">
                  <LogOut className="w-4 h-4 mr-2" /> Keluar (Logout)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
