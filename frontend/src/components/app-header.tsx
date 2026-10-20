"use client"

import { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Bell, Search, ChevronDown, MapPin, Check, Command } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "./theme-toggle"
import { 
 DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
 DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"

export function AppHeader() {
 const router = useRouter()
 const [user, setUser] = useState<any>(null)
 const [activeWarehouse, setActiveWarehouse] = useState<any>(null)
 const [warehouses, setWarehouses] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)

 useEffect(() => {
 // Fetch live warehouses
 api.get('/inventory/warehouses').then(res => {
 if (res.data) setWarehouses(res.data)
 }).catch(err => console.error("Error fetching warehouses", err))

 // Check local storage for user data
 if (typeof window !== "undefined") {
 const storedUser = localStorage.getItem("erp_user")
 if (storedUser) {
 try {
 const parsedUser = JSON.parse(storedUser)
 setUser(parsedUser)
 
 // Check if active warehouse is already in local storage
 const storedActive = localStorage.getItem("active_warehouse")
 if (storedActive && storedActive !== "null" && storedActive !== "undefined") {
 setActiveWarehouse(JSON.parse(storedActive))
 } else {
 // Default to Pusat (null warehouse)
 setActiveWarehouse(null)
 localStorage.setItem("active_warehouse", JSON.stringify(null)); window.dispatchEvent(new Event("warehouse_changed"));
 }
 } catch (e) {
 console.error("Error parsing user data", e)
 }
 }
 }
 }, [])

 const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications?take=20'),
        api.get('/notifications/unread-count')
      ])
      setNotifications(notifRes.data || [])
      setUnreadCount(countRes.data?.count || 0)
    } catch (_e) { /* silent */ }
  }

  const handleSelectWarehouse = (wh: any) => {
 setActiveWarehouse(wh)
 localStorage.setItem("active_warehouse", JSON.stringify(wh)); window.dispatchEvent(new Event("warehouse_changed"));
 window.location.reload() // Reload to fetch data contextually
 }

 return (
 <header className="flex h-16 shrink-0 items-center gap-4 border-b border-sidebar-border bg-sidebar px-6 z-10 transition-colors text-sidebar-foreground shadow-sm">
 <SidebarTrigger className="-ml-1 text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" />
 <Separator orientation="vertical" className="mx-1 h-5 bg-sidebar-border" />
 
 {/* WAREHOUSE SELECTOR */}
 <DropdownMenu>
 <DropdownMenuTrigger className="flex items-center gap-2 md:gap-2.5 px-2 md:px-3 py-1.5 border border-sidebar-border bg-sidebar-accent/30 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all ml-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring text-sidebar-foreground">
 <div className="bg-primary/10 text-primary p-1 rounded-md">
 <MapPin className="w-3.5 h-3.5" />
 </div>
 <div className="hidden md:flex flex-col items-start">
 <span className="text-[9px] font-bold text-sidebar-foreground/70 uppercase tracking-widest leading-none mb-1">Lokasi Gudang</span>
 <span className="text-[13px] font-semibold text-sidebar-foreground leading-none truncate max-w-[140px]">
 {activeWarehouse?.name || "Pusat (Semua)"}
 </span>
 </div>
 <ChevronDown className="w-4 h-4 text-sidebar-foreground/70 ml-1 hidden md:block" />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-64 p-1">
 <div className="px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilih Lokasi Kerja</div>
 <DropdownMenuSeparator className="mx-1" />
 
 <DropdownMenuItem 
 id="warehouse-pusat"
 onClick={() => handleSelectWarehouse(null)}
 className={`cursor-pointer my-0.5 rounded-md px-3 py-2 ${!activeWarehouse ? 'bg-primary/10 text-primary' : ''}`}
 >
 <div className="flex items-center justify-between w-full">
 <span className="font-medium text-sm">Pusat (Semua Akses)</span>
 {!activeWarehouse && <Check className="w-4 h-4" />}
 </div>
 </DropdownMenuItem>
 
 {warehouses?.map((wh, idx) => (
 <DropdownMenuItem 
 id={`warehouse-${wh?.id || idx}`}
 key={wh?.id || idx} 
 onClick={() => handleSelectWarehouse(wh)}
 className={`cursor-pointer my-0.5 rounded-md px-3 py-2 ${activeWarehouse?.id === wh?.id ? 'bg-primary/10 text-primary' : ''}`}
 >
 <div className="flex items-center justify-between w-full">
 <span className="font-medium text-sm">{wh?.name || "Unknown"}</span>
 {activeWarehouse?.id === wh?.id && <Check className="w-4 h-4" />}
 </div>
 </DropdownMenuItem>
 ))}
 
 {(user?.role === "Owner" || user?.role === "Admin" || user?.name?.toLowerCase().includes("ikan")) && (
 <>
 <DropdownMenuSeparator className="mx-1 mt-1" />
 <DropdownMenuItem 
 id="warehouse-manage"
 onClick={() => router.push("/settings/warehouse")}
 className="cursor-pointer text-primary font-medium focus:text-primary focus:bg-primary/10 my-0.5 rounded-md px-3 py-2"
 >
 + Kelola Gudang
 </DropdownMenuItem>
 </>
 )}
 </DropdownMenuContent>
 </DropdownMenu>

 <div className="flex flex-1 items-center gap-4 px-2 lg:px-6">
 <div className="hidden md:flex h-9 w-full max-w-lg items-center gap-2.5 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-3 text-sidebar-foreground focus-within:border-sidebar-primary focus-within:ring-1 focus-within:ring-sidebar-primary transition-all shadow-sm">
 <Search className="h-[15px] w-[15px] opacity-70" />
 <input 
 type="text" 
 placeholder="Cari menu, pelanggan, atau transaksi... (Ctrl+K)" 
 className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-sidebar-foreground/50 text-sidebar-foreground"
 />
 <div className="hidden sm:flex items-center gap-1 opacity-60">
 <Command className="h-3 w-3" />
 <span className="text-[10px] font-medium tracking-widest">K</span>
 </div>
 </div>
 <button className="md:hidden relative text-sidebar-foreground/80 hover:text-sidebar-accent-foreground transition-colors h-9 w-9 flex items-center justify-center rounded-md hover:bg-sidebar-accent ml-auto">
   <Search className="h-4 w-4" />
 </button>
 </div>
 <div className="flex items-center gap-1 md:gap-4 shrink-0">
 <ThemeToggle />
 {(user?.role?.toLowerCase().includes('owner') || user?.name?.toLowerCase().includes('ikan')) ? (
  <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
    <DropdownMenuTrigger className="relative text-sidebar-foreground/80 hover:text-sidebar-accent-foreground transition-colors h-9 w-9 flex items-center justify-center rounded-md hover:bg-sidebar-accent outline-none">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg" sideOffset={8}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-sm">Notifikasi</span>
        {unreadCount > 0 && (
          <button
            onClick={async (e) => { e.stopPropagation(); try { await api.post('/notifications/read-all'); fetchNotifications(); } catch(_e){} }}
            className="text-xs text-primary hover:underline"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">Tidak ada notifikasi</div>
        ) : (
          notifications.map((notif: any) => (
            <div
              key={notif.id}
              onClick={async () => {
                try { if (!notif.is_read) { await api.post('/notifications/' + notif.id + '/read'); setNotifications((prev: any[]) => prev.map((n: any) => n.id === notif.id ? {...n, is_read: true} : n)); setUnreadCount((prev: number) => Math.max(0, prev - 1)); } } catch(_e){}
                if (notif.action_url) { setNotifOpen(false); router.push(notif.action_url); }
              }}
              className={'flex gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ' + (!notif.is_read ? 'bg-primary/5' : '')}
            >
              <div className={'mt-1.5 w-2 h-2 rounded-full shrink-0 ' + (notif.severity === 'SUCCESS' ? 'bg-green-500' : notif.severity === 'WARNING' ? 'bg-amber-500' : notif.severity === 'ERROR' ? 'bg-red-500' : 'bg-blue-500')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{notif.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(notif.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
) : (
  <button className="relative text-sidebar-foreground/80 hover:text-sidebar-accent-foreground transition-colors h-9 w-9 flex items-center justify-center rounded-md hover:bg-sidebar-accent">
    <Bell className="h-4 w-4" />
  </button>
)}
 <Separator orientation="vertical" className="hidden md:block h-5 bg-sidebar-border mx-1" />
 <div className="flex items-center gap-3 cursor-pointer group hover:bg-sidebar-accent py-1 px-2 rounded-md transition-colors">
 <Avatar className="h-8 w-8 border border-border shadow-sm">
 <AvatarImage src="https://github.com/shadcn.png" />
 <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">US</AvatarFallback>
 </Avatar>
 <div className="hidden md:flex flex-col items-start justify-center">
 <span className="text-[13px] font-semibold text-sidebar-foreground group-hover:text-sidebar-primary transition-colors leading-tight">{user?.name || "Administrator"}</span>
 <span className="text-[11px] text-sidebar-foreground/70 font-medium leading-tight">{user?.role || "Owner"}</span>
 </div>
 </div>
 </div>
 </header>
 )
}

