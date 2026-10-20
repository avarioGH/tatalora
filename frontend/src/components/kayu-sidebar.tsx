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
 LayoutDashboard, Clock, Folder, Link as LinkIcon, History, AlertTriangle, PlayCircle, Filter, Tag, Hash, FileCode, CheckCircle, Database, PackageSearch, PenTool, Wrench, ShieldCheck, LifeBuoy, FileSearch, Zap, TrendingUp, Sparkles, Building2, Fingerprint, Receipt, UserCheck, ShieldAlert, Key, HelpCircle, Share2, Users, Box, Calculator, Settings, 
 ShoppingCart, BarChart3, Bot, LogOut, Hexagon
, Factory} from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { TranslationKey } from "@/i18n/dictionaries"

type MenuItem = {
 title: string;
 url: string;
 icon: any;
 subItems?: { title: string; url: string; badge?: string; type?: string }[];
 badge?: string;
 id?: string;
}

const items: MenuItem[] = [
 { title: "Dashboard Utama", url: "/", icon: LayoutDashboard, id: "generic-dashboard" },
   { title: "Dashboard Kayu", url: "/inventory/dashboard", icon: Factory, id: "dashboard" },
 
 { 
 title: "Pembelian & Inbound", 
 url: "/inventory/partai", 
 icon: ShoppingCart,
 id: "inbound",
 subItems: [
 { title: "Manajemen Partai", url: "/inventory/partai" },
 { title: "Beli Masak (Kayu Olahan)", url: "/inventory/purchase" },
   ]
 },
 
 { 
 title: "Pengolahan & Produksi", 
 url: "/production/chamber", 
 icon: Factory,
 id: "production",
 subItems: [
 { title: "Chamber (Oven)", url: "/production/chamber" },
 { title: "Sawn Timber Output", url: "/inventory/sawn-timber/output" },
 { title: "Produksi Sawmill (Re-sawing)", url: "/production/sawmill" }
 ]
 },
 
 { 
 title: "Manajemen Gudang (Stok)", 
 url: "/inventory/timber-stock", 
 icon: Box,
 id: "inventory",
 subItems: [
 { title: "Stok Kayu Jadi", url: "/inventory/timber-stock" },
 { title: "Pergerakan Stok", url: "/inventory/movements" },
 { title: "Penyesuaian Stok", url: "/inventory/adjustments" },
 { title: "Stock Opname & Audit", url: "/inventory/stock-opname" }
 ]
 },
 
 { 
 title: "Penjualan (Outbound)", 
 url: "/sales/orders", 
 icon: ShoppingCart,
 id: "outbound",
 subItems: [
 { title: "Penawaran (Quotation)", url: "/sales/quotations" },
 { title: "Sales Orders (SO)", url: "/sales/orders" },
 { title: "Data Muat & Rekap Fuso", url: "/inventory/shipment" },
 { title: "Monitoring Realisasi PO", url: "/sales/timber/reports/order-realization" },
 { title: "Surat Jalan (Pengiriman)", url: "/sales/deliveries" },
  { title: "Daftar Pelanggan", url: "/sales/customers" }
 ]
 },
 
 { 
 title: "Laporan & Analitik", 
 url: "/inventory/reports/stock-card", 
 icon: BarChart3,
 id: "reports",
 subItems: [
 { title: "Kartu Stok (Stock Card)", url: "/inventory/reports/stock-card" },
 { title: "Lacak Asal Usul (Traceability)", url: "/inventory/reports/traceability" },
 { title: "Laporan Pergerakan", url: "/inventory/reports/movements" }
 ]
 },
 
 { 
 title: "Master Data & Pengaturan", 
 url: "/inventory/master-data/species", 
 icon: Database,
 id: "master_data",
 subItems: [
 { title: "Katalog Kayu", url: "#", type: "label" },
 { title: "Data Species", url: "/inventory/master-data/species" },
 { title: "Data Grade", url: "/inventory/master-data/grade" },
 
 { title: "Lokasi & Logistik", url: "#", type: "label" },
 { title: "Gudang & Lokasi", url: "/inventory/warehouses" },
 { title: "Asal Usul (Source)", url: "/inventory/master-data/source" },
 { title: "Data Kendaraan", url: "/inventory/master-data/vehicle" },
 { title: "Data Supir", url: "/inventory/master-data/driver" },

 { title: "Lainnya", url: "#", type: "label" },
 { title: "Data Import (Excel)", url: "/inventory/import" },
 { title: "Audit Log", url: "/inventory/audit" }
 ]
 }
];

const settings: MenuItem[] = [
  { title: "Pengguna & Role", url: "/settings/users", icon: UserCheck, id: "settings" },
  { title: "Pengaturan Sistem", url: "/settings/company", icon: Settings, id: "settings" },
  { title: "Integrasi API", url: "/settings/integrations", icon: Share2, id: "settings" },
  { title: "Audit Log", url: "/monitoring/audit-log", icon: ShieldAlert, id: "settings" },
];

export function KayuSidebar() {
 const pathname = usePathname()
 const { t } = useLanguage()
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
 <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center text-sidebar-primary-foreground shadow-sm">
 <Hexagon className="h-5 w-5" />
 </div>
 <span className="font-bold text-lg tracking-tight text-sidebar-foreground">ERP Boostup</span>
 </SidebarHeader>
 
 <SidebarContent className="px-3 py-4 custom-scrollbar">
 <SidebarGroup>
 <SidebarGroupLabel className="text-[11px] font-[650] tracking-widest text-sidebar-foreground/50 uppercase mb-4 px-2 mt-2">Core Modules</SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu className="gap-[2px]">
 {(Array.isArray(items) ? items : []).filter(item => {
 const userName = user?.name?.toLowerCase() || "";
 const isKayu = true;
 const isIkan = false; // Default to Ikan logic if not explicitly Kayu
 
 if (isKayu) {
      const allowedForKayu = ['inventory', 'production', 'dashboard', 'settings', 'ai', 'sales', 'pos', 'crm', 'finance', 'hr', 'inbound', 'outbound', 'reports', 'master_data'];
      if (item.id && !allowedForKayu.includes(item.id)) return false;
      if (!item.id || user?.role === 'Owner') return true;
      return user?.accessible_modules?.includes(item.id);
    } else {
      const hiddenForIkan = ['inventory', 'production', 'sales', 'pos', 'crm', 'finance'];
      if (item.id && hiddenForIkan.includes(item.id)) return false;
      return true; // Bypass accessible modules for Ikan
    }
 }).map((item) => {
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
 <span className="px-2 py-0.5 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold uppercase tracking-wider">
 {item.badge}
 </span>
 )}
 </Link>
 }
 />
 {item.subItems && (
 <SidebarMenuSub className="border-l border-sidebar-border ml-[1.1rem] mt-1.5 mb-3 pl-3">
 {item.subItems.map((subItem) => {
 if (subItem.type === 'label') {
 return (
 <div key={subItem.title} className="text-[10px] font-bold text-sidebar-foreground/70/70 uppercase tracking-widest mt-4 mb-1.5 px-2">
 {subItem.title}
 </div>
 )
 }
 const subActive = pathname === subItem.url
 return (
 <SidebarMenuSubItem key={subItem.title}>
 <Link href={subItem.url} className="w-full">
 <SidebarMenuSubButton 
 isActive={subActive}
 className={`text-[13px] py-1.5 h-auto transition-colors rounded-md ${subActive ? 'text-sidebar-primary-foreground font-bold' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
 >
 <span className="w-full flex justify-between items-center">
 {subItem.title}
 {subItem.badge && (
 <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">
 {subItem.badge}
 </span>
 )}
 </span>
 </SidebarMenuSubButton>
 </Link>
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
 <SidebarGroupLabel className="text-[11px] font-[650] tracking-widest text-sidebar-foreground/50 uppercase mb-4 px-2 mt-2">Settings</SidebarGroupLabel>
 <SidebarGroupContent>
 <SidebarMenu className="gap-[2px]">
 {(Array.isArray(settings) ? settings : []).filter(item => {
 const userName = user?.name?.toLowerCase() || "";
 const isKayu = true;
 const isIkan = false;
 if (isIkan) return true;

 if (!item.id || user?.role === 'Owner') return true;
 return user?.accessible_modules?.includes(item.id);
 }).map((item) => {
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














