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
 { title: "Dashboard", url: "/", icon: LayoutDashboard, id: "generic-dashboard" },
 {
 title: "Master Data",
 url: "/inventory/products",
 icon: Database,
 id: "ikan_master_data",
 subItems: [
 { title: "Produk Ikan", url: "/inventory/products" },
            { title: "Lokasi Gudang", url: "/inventory/warehouses" },
 { title: "Daftar Pelanggan", url: "/crm/partners" }
 ]
 },
 {
 title: "Inventori",
 url: "/inventory/stock",
 icon: Box,
 id: "ikan_inventory",
 subItems: [
 { title: "Pembelian Ikan (Nelayan)", url: "/inventory/purchase-fish/create" },
 { title: "Riwayat Pembelian", url: "/purchasing/orders" },
 { title: "Pengolahan Stok (Repacking)", url: "/inventory/fish-processing/create" },
 { title: "Ikan Masuk", url: "/inventory/inflow" },
 { title: "Stok Ikan", url: "/inventory/stock" },
 { title: "Stock Movement", url: "/inventory/movements" },
 { title: "Input Stok Awal", url: "/inventory/initial-stock" },
 { title: "Pemusnahan", url: "/inventory/disposals" }
 ]
 },
 {
 title: "Laporan",
 url: "/reports/stock",
 icon: BarChart3,
 id: "ikan_reports",
 subItems: [
 { title: "Laporan Stok", url: "/reports/stock" },
 { title: "Laporan Ikan Masuk", url: "/reports/inflow" },
 { title: "Laporan POS", url: "/reports/pos" },
 { title: "Laporan Sales", url: "/reports/sales" },
 { title: "Laporan Penjualan", url: "/reports/profit" }
 ]
 },
 {
 title: "Penjualan",
 url: "/pos/new-transaction",
 icon: ShoppingCart,
 id: "ikan_sales",
 subItems: [
 { title: "POS (Kasir Retail)", url: "/pos/new-transaction" },
 { title: "Sales Orders", url: "/sales/orders" },
 { title: "Pelanggan & Piutang", url: "/sales/customers" },
 { title: "Pengiriman", url: "/sales/deliveries" },
        { title: "Daftar Ekspor", url: "/sales/exports" }
 ]
 },
 {
 title: "Pembelian (Purchasing)",
 url: "/purchasing/analytics",
 icon: ShoppingCart,
 id: "purchasing",
 subItems: [
 { title: "Overview", url: "/purchasing/analytics" },
 { title: "Purchase Requests", url: "/purchasing/requests" },
 { title: "RFQ (Penawaran)", url: "/purchasing/rfqs" },
 { title: "Purchase Orders (PO)", url: "/purchasing/orders" },
 { title: "Penerimaan Barang", url: "/purchasing/receipts" }
 ]
 },
 { 
 title: "Inventory (Timber & Logs)", 
 url: "/inventory/dashboard", 
 icon: Box,
 id: "inventory",
 subItems: [
 { title: "Dashboard", url: "/inventory/dashboard" },

 { title: "Partai (Project)", url: "#", type: "label" },
        { title: "Manajemen Partai", url: "/inventory/partai" },

        { title: "Purchase & Shipment", url: "#", type: "label" },
 { title: "Shipment (Delivery)", url: "/inventory/shipment" },
 
 { title: "Master Data", url: "#", type: "label" },
 { title: "Species", url: "/inventory/master-data/species" },
 { title: "Grade", url: "/inventory/master-data/grade" },
 { title: "Source", url: "/inventory/master-data/source" },
 { title: "Location", url: "/inventory/master-data/location" },
 { title: "Vehicle", url: "/inventory/master-data/vehicle" },
 { title: "Driver", url: "/inventory/master-data/driver" },
 
 { title: "Produksi Log", url: "#", type: "label" },
 { title: "Sawn Timber Output", url: "/inventory/sawn-timber/output" },
 
 { title: "Proses Lanjutan", url: "#", type: "label" },
 { title: "Chamber (Oven)", url: "/production/chamber" },
 
 { title: "Stock Kayu", url: "#", type: "label" },
 { title: "Finished Timber Stock", url: "/inventory/timber-stock" },
 { title: "Stock Movements", url: "/inventory/movements" },
 { title: "Stock Adjustments", url: "/inventory/adjustments" },
 { title: "Location Management", url: "/inventory/warehouses" },
 
 { title: "Report & Traceability", url: "#", type: "label" },
 { title: "Stock Movement Explorer", url: "/inventory/reports/movements" },
 { title: "Stock Card", url: "/inventory/reports/stock-card" },
 { title: "Operational Dashboard", url: "/inventory/reports/traceability" },
 
 { title: "Data & Audit", url: "#", type: "label" },
 { title: "Data Import (Excel)", url: "/inventory/import" },
 { title: "Audit Log", url: "/inventory/audit" },
        { title: "Reservation Reconciliation", url: "/inventory/reconciliation/reservations" },
 { title: "Stock Opname & Audit", url: "/inventory/stock-opname" }
 ]
 },

 { 
 title: "Manufacturing", 
 url: "/manufacturing/orders", 
 icon: Factory,
 id: "manufacturing",
 subItems: [
 { title: "Overview", url: "/manufacturing/orders" },
 { title: "Bills of Materials", url: "/manufacturing/bom" },
 { title: "MRP", url: "/manufacturing/mrp" },
 { title: "Manufacturing Orders", url: "/manufacturing/orders" },
 { title: "Quality Control", url: "/manufacturing/quality" }
 ]
 },
 { 
 title: "Production", 
 url: "/inventory/production", 
 icon: Factory,
 id: "production",
 subItems: [
 { title: "Production List", url: "/inventory/production" },
 { title: "New Production", url: "/inventory/production/create" },
 ]
 },

 { 
 title: "Penjualan (Sales B2B)", 
 url: "/sales/orders", 
 icon: ShoppingCart,
 id: "sales",
 subItems: [
 { title: "Penawaran (Quotation)", url: "/sales/quotations" },
 { title: "Sales Orders (SO)", url: "/sales/orders" },
 { title: "Pelanggan & Piutang", url: "/sales/customers" },
 { title: "Pengiriman (Delivery)", url: "/sales/deliveries" },
        { title: "Daftar Ekspor", url: "/sales/exports" }
 ]
 },
 { 
 title: "POS (Kasir Retail)", 
 
 url: "/pos/new-transaction", 
 icon: ShoppingCart,
 id: "pos",
 subItems: [
 { title: "Kasir POS", url: "/pos/new-transaction" },
 { title: "Riwayat Penjualan", url: "/pos/order-history" },
 { title: "Shift & Kas", url: "/pos/shift" }
 ]
 },
 { 
 title: "Pelanggan & CRM", 
 url: "/crm/partners", 
 icon: Users,
 id: "crm",
 subItems: [
 { title: "Daftar Pelanggan", url: "/crm/partners" },
        { title: "WhatsApp Chat", url: "/crm/whatsapp" },
 { title: "Pipeline & Leads", url: "/crm/pipeline" },
 { title: "Loyalty & Poin", url: "/customers/loyalty" },
 { title: "Voucher", url: "/customers/voucher" }
 ]
 },
 {
 title: "Keuangan & Akuntansi", 
 url: "/finance", 
 icon: Calculator,
 id: "finance",
 subItems: [
 { title: "Dashboard Keuangan", url: "/finance" },
 { title: "Kas & Bank", url: "/finance/cash" },
 { title: "Pemasukan", url: "/finance/cash-in" },
 { title: "Pengeluaran", url: "/finance/cash-out" },
 { title: "Buku Besar (GL)", url: "/finance/gl" },
 { title: "Periode Akuntansi", url: "/finance/accounting-periods" },
 { title: "Laporan Keuangan", url: "/finance/reports" }
 ]
 },
 {
 title: "HR & Absensi",
 url: "/hr",
 icon: UserCheck,
 id: "hr",
 subItems: [
 { title: "Dashboard HR", url: "/hr" },
 { title: "Pegawai", url: "/hr/employees" },
 { title: "Absensi", url: "/hr/attendance" },
 { title: "Penggajian (Payroll)", url: "/hr/payroll" },
 { title: "Shift", url: "/hr/shift" }
 ]
 },
 { 
 title: "AI Assistant", 
 url: "/ai/chat", 
 icon: Bot,
 badge: "Beta",
 subItems: [
 { title: "Chat AI", url: "/ai/chat" },
 { title: "Analisis Inventaris", url: "/ai/inventory-analysis" },
 { title: "Analisis Keuangan", url: "/ai/finance-analysis" },
 { title: "Prediksi", url: "/ai/prediction" }
 ]
 }
]

const settings: MenuItem[] = [
 { title: "Pengguna & Role", url: "/settings/users", icon: UserCheck, id: "settings" },
 { title: "Pengaturan Sistem", url: "/settings/company", icon: Settings, id: "settings" },
 { title: "Integrasi API", url: "/settings/integrations", icon: Share2, id: "settings" },
 { title: "Audit Log", url: "/monitoring/audit-log", icon: ShieldAlert, id: "settings" },
]

export function IkanSidebar() {
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
 const isKayu = false;
 const isIkan = true; // Default to Ikan logic if not explicitly Kayu
 
 if (isKayu) {
      const allowedForKayu = ['inventory', 'production', 'dashboard', 'settings', 'ai', 'sales', 'pos', 'crm', 'finance', 'hr'];
      if (item.id && !allowedForKayu.includes(item.id)) return false;
      
      
      const role = (user?.role || '').toLowerCase();
      if (!item.id || role === 'owner' || role === 'admin') return true;


      return user?.accessible_modules?.includes(item.id);
    } else {
      const hiddenForIkan = ['inventory', 'production', 'sales', 'pos', 'crm', 'finance', 'purchasing', 'manufacturing'];
      if (item.id && hiddenForIkan.includes(item.id)) return false;
      
      
      const role = (user?.role || '').toLowerCase();
      if (!item.id || role === 'owner' || role === 'admin') return true;


      const idMap: any = { ikan_master_data: 'inventory', ikan_inventory: 'inventory', ikan_reports: 'reports', ikan_sales: 'pos' };
      const reqId = idMap[item.id] || item.id;
      if (!user?.accessible_modules) return false;
      return user.accessible_modules.includes(reqId);
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
 const isKayu = false;
 const isIkan = true;
 
      const ur = (user?.role || '').toLowerCase();
      if (ur !== 'owner' && ur !== 'admin') return false;
 // Settings only for owner in this simplified RBAC

 
      
      const role = (user?.role || '').toLowerCase();
      if (!item.id || role === 'owner' || role === 'admin') return true;


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















