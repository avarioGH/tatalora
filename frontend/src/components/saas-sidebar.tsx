"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
 Sidebar,
 SidebarContent,
 SidebarFooter,
 SidebarGroup,
 SidebarGroupContent,
 SidebarGroupLabel,
 SidebarHeader,
 SidebarMenu,
 SidebarMenuButton,
 SidebarMenuItem,
 SidebarMenuSub,
 SidebarMenuSubItem,
 SidebarMenuSubButton
} from "@/components/ui/sidebar"
import { 
 LayoutDashboard, ShoppingCart, ShoppingBag, Receipt, Box, Database, 
 BarChart3, Wallet, FileText, Building, Users, BadgeDollarSign, 
 HeartHandshake, MonitorSmartphone, Truck, Store, Star, Settings, HelpCircle, LogOut, Hexagon
} from "lucide-react"

type MenuItem = {
 title: string;
 url: string;
 icon: any;
 subItems?: { title: string; url: string; badge?: string; type?: string }[];
 badge?: string;
 id?: string;
}

const items: MenuItem[] = [
 { title: "Beranda", url: "/", icon: LayoutDashboard, id: "dashboard" },
 {
   title: "Penjualan",
    url: "/sales",
    icon: ShoppingBag,
    id: "sales"
 },
 {
   title: "Pembelian",
   url: "/purchasing",
   icon: ShoppingCart,
   id: "purchasing",
   subItems: [
     { title: "Overview", url: "/purchasing/overview" },
     { title: "Tagihan Pembelian", url: "/purchasing/invoices" },
     { title: "Pengiriman Pembelian", url: "/purchasing/receipts" },
     { title: "Pesanan Pembelian", url: "/purchasing/orders" },
     { title: "Penawaran Pembelian", url: "/purchasing/rfqs" }
   ]
 },
 { title: "Biaya", url: "/finance/expenses", icon: Receipt, id: "expenses" },
 { title: "Produk", url: "/inventory/products", icon: Box, id: "products" },
 { title: "Inventori", url: "/inventory/stock", icon: Database, id: "inventory", subItems: [{ title: "Daftar Stok", url: "/inventory/stock" }, { title: "Input Stok Masuk", url: "/inventory/inflow" }, { title: "Pemusnahan Stok", url: "/inventory/disposals" }] },
 { title: "Laporan", url: "/reports", icon: BarChart3, id: "reports" },
 { title: "Kas & Bank", url: "/finance/cash", icon: Wallet, id: "cash" },
 { title: "Buku Besar (GL)", url: "/finance/gl", icon: FileText, id: "accounting" },
 { title: "Aset Tetap", url: "/assets", icon: Building, id: "assets" },
 { title: "Kontak", url: "/crm/partners", icon: Users, id: "contacts" },
 { title: "Payroll", url: "/hr/payroll", icon: BadgeDollarSign, id: "payroll", badge: "★" },
 { title: "CRM", url: "/crm", icon: HeartHandshake, id: "crm", badge: "★" },
 { title: "POS", url: "/pos/new-transaction", icon: MonitorSmartphone, id: "pos", badge: "★" },
 { title: "Distribusi", url: "/distribution", icon: Truck, id: "distribution", badge: "★" },
 { title: "Marketplace", url: "/marketplace", icon: Store, id: "marketplace", badge: "★" },
 { title: "Membership", url: "/membership", icon: Star, id: "membership", badge: "★" },
]

const settings: MenuItem[] = [
 { title: "Pengaturan", url: "/settings", icon: Settings, id: "settings" },
 { title: "FAQ", url: "/faq", icon: HelpCircle, id: "faq" },
]

export function SaasSidebar() {
 const pathname = usePathname()
 const [user, setUser] = useState<any>(null)

 useEffect(() => {
   if (typeof window !== 'undefined') {
     const stored = localStorage.getItem("erp_user")
     if (stored) {
       try {
         setUser(JSON.parse(stored))
       } catch(e) {}
     }
   }
 }, [])

 const isActive = (url: string) => {
   if (url === "/" && pathname !== "/") return false
   return pathname.startsWith(url)
 }

 return (
   <Sidebar className="border-r border-sidebar-border bg-sidebar h-full">
     <SidebarHeader className="p-4 flex flex-row items-center gap-3 border-b border-sidebar-border/50">
       <img src="/logo.png" alt="TATALORA" className="h-8 w-8 rounded-lg object-contain shadow-xs" />
       <span className="font-bold text-lg tracking-tight text-sidebar-foreground">TATALORA</span>
     </SidebarHeader>
     
     <SidebarContent className="px-3 py-4 custom-scrollbar">
       <SidebarGroup>
         <SidebarGroupContent>
           <SidebarMenu className="gap-[2px]">
             {items.map((item) => {
               const active = isActive(item.url)
               return (
                 <SidebarMenuItem key={item.title}>
                   <SidebarMenuButton
                     isActive={active}
                     className={`font-medium transition-colors duration-200 rounded-lg px-3 py-2.5 h-auto ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
                     render={
                       <Link href={item.url} className="flex items-center justify-between w-full">
                         <div className="flex items-center gap-3">
                           <item.icon className={`h-[18px] w-[18px] ${active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70'}`} />
                           <span className="text-[14px] leading-none">{item.title}</span>
                         </div>
                         {item.badge && (
                           <span className="text-orange-400 text-[14px]">
                             {item.badge}
                           </span>
                         )}
                       </Link>
                     }
                   />
                   {item.subItems && (
                     <SidebarMenuSub className="border-l border-sidebar-border ml-[1.1rem] mt-1.5 mb-3 pl-3">
                       {item.subItems.map((subItem) => {
                         const subActive = pathname === subItem.url
                         return (
                           <SidebarMenuSubItem key={subItem.title}>
                             <SidebarMenuSubButton 
                               isActive={subActive}
                               className={`text-[13px] py-1.5 h-auto transition-colors rounded-md ${subActive ? 'text-sidebar-primary-foreground font-bold' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
                               render={
                                 <Link href={subItem.url} className="w-full">
                                   <span className="w-full flex justify-between items-center">
                                     {subItem.title}
                                   </span>
                                 </Link>
                               }
                             />
                           </SidebarMenuSubItem>
                         )
                       })}
                     </SidebarMenuSub>
                   )}
                 </SidebarMenuItem>
               )
             })}
           </SidebarMenu>
         </SidebarGroupContent>
       </SidebarGroup>
       
       <SidebarGroup className="mt-6 mb-4">
         <SidebarGroupContent>
           <SidebarMenu className="gap-[2px]">
             {settings.map((item) => {
               const active = isActive(item.url)
               return (
                 <SidebarMenuItem key={item.title}>
                   <SidebarMenuButton
                     isActive={active}
                     className={`font-medium transition-colors duration-200 rounded-lg px-3 py-2.5 h-auto ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
                     render={
                       <Link href={item.url} className="flex items-center gap-3 w-full">
                         <item.icon className={`h-[18px] w-[18px] ${active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70'}`} />
                         <span className="text-[14px] leading-none">{item.title}</span>
                       </Link>
                     }
                   />
                 </SidebarMenuItem>
               )
             })}
           </SidebarMenu>
         </SidebarGroupContent>
       </SidebarGroup>
     </SidebarContent>
     
     <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar">
       <a href="/login" className="flex items-center gap-3 text-sidebar-foreground/70 hover:text-destructive font-medium transition-colors w-full rounded-lg hover:bg-destructive/10 px-3 py-2" onClick={() => localStorage.removeItem("erp_token")}>
         <LogOut className="h-[18px] w-[18px]" />
         <span className="text-[14px]">Sign Out</span>
       </a>
     </SidebarFooter>
   </Sidebar>
 )
}





