"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { 
  ShoppingCart, Box, TrendingUp, MonitorSmartphone, 
  Truck, Users, UserCheck, BarChart3, Wallet, Settings,
  AlertTriangle, Clock, ArrowRight, CheckCircle2, ShieldAlert
} from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HomeLauncher() {
  const [userName, setUserName] = useState("Admin")
  const [urgentStats, setUrgentStats] = useState({
    overdueSales: 0,
    overduePurchases: 0,
    negativeStock: 0,
    pendingDeliveries: 0,
    pendingApprovals: 0,
    loading: true
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("erp_user")
      if (stored) {
        try {
          const user = JSON.parse(stored)
          if (user.name) setUserName(user.name)
        } catch(e) {}
      }
    }

    // Fetch operational priorities
    const fetchPriorities = async () => {
      try {
        const [salesRes, purRes, prodRes, delRes, appRes] = await Promise.allSettled([
          api.get('/sales/invoices?status=UNPAID'),
          api.get('/purchasing/invoices?status=UNPAID'),
          api.get('/inventory/products'),
          api.get('/sales/deliveries?status=PENDING'),
          api.get('/approval/count')
        ])

        let overdueS = 0
        let overdueP = 0
        let negStock = 0
        let pendDel = 0
        let pendApp = 0

        const today = new Date()

        if (salesRes.status === 'fulfilled' && Array.isArray(salesRes.value?.data)) {
          overdueS = salesRes.value.data.filter((inv: any) => {
            const due = inv.due_date ? new Date(inv.due_date) : null
            return due && due < today && inv.payment_status !== 'PAID'
          }).length
        }

        if (purRes.status === 'fulfilled' && Array.isArray(purRes.value?.data)) {
          overdueP = purRes.value.data.filter((inv: any) => {
            const due = inv.due_date ? new Date(inv.due_date) : null
            return due && due < today && inv.payment_status !== 'PAID'
          }).length
        }

        if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value?.data)) {
          negStock = prodRes.value.data.filter((p: any) => (Number(p.stock || 0) < 0)).length
        }

        if (delRes.status === 'fulfilled' && Array.isArray(delRes.value?.data)) {
          pendDel = delRes.value.data.length
        }

        if (appRes.status === 'fulfilled' && typeof appRes.value?.data === 'number') {
          pendApp = appRes.value.data
        }

        setUrgentStats({
          overdueSales: overdueS,
          overduePurchases: overdueP,
          negativeStock: negStock,
          pendingDeliveries: pendDel,
          pendingApprovals: pendApp,
          loading: false
        })
      } catch (_e) {
        setUrgentStats(prev => ({ ...prev, loading: false }))
      }
    }

    fetchPriorities()
  }, [])

  const apps = [
    { 
      title: "Penjualan", 
      desc: "Transaksi & Tagihan", 
      url: "/sales", 
      icon: <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-blue-400 to-blue-600",
      shadow: "shadow-blue-500/30"
    },
    { 
      title: "POS", 
      desc: "Kasir & Retail", 
      url: "/pos/new-transaction", 
      icon: <MonitorSmartphone className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-indigo-400 to-indigo-600",
      shadow: "shadow-indigo-500/30"
    },
    { 
      title: "Inventori", 
      desc: "Stok & Gudang", 
      url: "/inventory/stock", 
      icon: <Box className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-emerald-400 to-emerald-600",
      shadow: "shadow-emerald-500/30"
    },
    { 
      title: "Pembelian", 
      desc: "Beli & Restock", 
      url: "/purchasing", 
      icon: <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-cyan-400 to-cyan-600",
      shadow: "shadow-cyan-500/30"
    },
    { 
      title: "Pengiriman", 
      desc: "Logistik & Surat Jalan", 
      url: "/sales/deliveries", 
      icon: <Truck className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-amber-400 to-amber-600",
      shadow: "shadow-amber-500/30"
    },
    { 
      title: "Kontak", 
      desc: "Pelanggan & Vendor", 
      url: "/crm/partners", 
      icon: <Users className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-violet-400 to-violet-600",
      shadow: "shadow-violet-500/30"
    },
    { 
      title: "HR & Absensi", 
      desc: "Pegawai & Gaji", 
      url: "/hr/payroll", 
      icon: <UserCheck className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-rose-400 to-rose-600",
      shadow: "shadow-rose-500/30"
    },
    { 
      title: "Kas & Bank", 
      desc: "Keuangan & Akun", 
      url: "/finance/cash", 
      icon: <Wallet className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-teal-400 to-teal-600",
      shadow: "shadow-teal-500/30"
    },
    { 
      title: "Laporan", 
      desc: "Analitik & Kinerja", 
      url: "/reports", 
      icon: <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-fuchsia-400 to-fuchsia-600",
      shadow: "shadow-fuchsia-500/30"
    },
    { 
      title: "Pengaturan", 
      desc: "Konfigurasi Sistem", 
      url: "/settings", 
      icon: <Settings className="w-8 h-8 sm:w-10 sm:h-10" />, 
      color: "from-slate-400 to-slate-600",
      shadow: "shadow-slate-500/30"
    },
  ]

  const totalUrgent = urgentStats.overdueSales + urgentStats.overduePurchases + urgentStats.negativeStock + urgentStats.pendingDeliveries

  return (
    <div className="w-full flex flex-col items-center pt-2 sm:pt-6 pb-12 px-2 sm:px-6">
      
      <div className="text-center mb-6 max-w-2xl mx-auto flex flex-col items-center">
        <div className="flex items-center gap-3 mb-2">
          <img src="/logo.png" alt="TATALORA" className="w-10 h-10 object-contain drop-shadow-sm" />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            TATALORA Workspace
          </h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Selamat datang kembali, <span className="font-semibold text-foreground">{userName}</span>. Kelola operasional bisnis Anda dengan efisien.
        </p>
      </div>

      {/* PRIORITAS KERJA & TINDAKAN MENDESAK (UX-05) */}
      <div className="max-w-6xl w-full mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Prioritas Kerja & Tindakan Mendesak
            </h2>
          </div>
          {totalUrgent > 0 ? (
            <Badge variant="destructive" className="text-xs px-2 py-0.5 font-semibold">
              {totalUrgent} Perlu Tindakan
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-2 py-0.5 text-emerald-600 border-emerald-200 bg-emerald-50 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Semua Terkendali
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Piutang Jatuh Tempo */}
          <Link href="/finance/reports/ar-aging">
            <Card className="hover:border-rose-400 transition-all cursor-pointer border shadow-xs bg-card hover:shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Piutang Jatuh Tempo</p>
                  <p className={`text-xl font-bold mt-0.5 ${urgentStats.overdueSales > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                    {urgentStats.loading ? '...' : urgentStats.overdueSales} <span className="text-xs font-normal text-muted-foreground">faktur</span>
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${urgentStats.overdueSales > 0 ? 'bg-rose-100 text-rose-600' : 'bg-muted text-muted-foreground'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Utang Pemasok Jatuh Tempo */}
          <Link href="/finance/reports/ap-aging">
            <Card className="hover:border-amber-400 transition-all cursor-pointer border shadow-xs bg-card hover:shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Utang Jatuh Tempo</p>
                  <p className={`text-xl font-bold mt-0.5 ${urgentStats.overduePurchases > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                    {urgentStats.loading ? '...' : urgentStats.overduePurchases} <span className="text-xs font-normal text-muted-foreground">tagihan</span>
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${urgentStats.overduePurchases > 0 ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Menunggu Persetujuan */}
          <Link href="/approval">
            <Card className="hover:border-indigo-400 transition-all cursor-pointer border shadow-xs bg-card hover:shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Menunggu Persetujuan</p>
                  <p className={`text-xl font-bold mt-0.5 ${urgentStats.pendingApprovals > 0 ? 'text-indigo-600' : 'text-foreground'}`}>
                    {urgentStats.loading ? '...' : urgentStats.pendingApprovals} <span className="text-xs font-normal text-muted-foreground">tugas</span>
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${urgentStats.pendingApprovals > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-muted text-muted-foreground'}`}>
                  <UserCheck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Pengecualian Stok Negatif */}
          <Link href="/inventory/products">
            <Card className="hover:border-rose-400 transition-all cursor-pointer border shadow-xs bg-card hover:shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Stok Negatif / Kritis</p>
                  <p className={`text-xl font-bold mt-0.5 ${urgentStats.negativeStock > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                    {urgentStats.loading ? '...' : urgentStats.negativeStock} <span className="text-xs font-normal text-muted-foreground">produk</span>
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${urgentStats.negativeStock > 0 ? 'bg-rose-100 text-rose-600' : 'bg-muted text-muted-foreground'}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Pengiriman Pending */}
          <Link href="/sales/deliveries">
            <Card className="hover:border-blue-400 transition-all cursor-pointer border shadow-xs bg-card hover:shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Pengiriman Menunggu</p>
                  <p className={`text-xl font-bold mt-0.5 ${urgentStats.pendingDeliveries > 0 ? 'text-blue-600' : 'text-foreground'}`}>
                    {urgentStats.loading ? '...' : urgentStats.pendingDeliveries} <span className="text-xs font-normal text-muted-foreground">surat jalan</span>
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${urgentStats.pendingDeliveries > 0 ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                  <Truck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* DAFTAR MODUL ERP */}
      <div className="max-w-6xl w-full">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Aplikasi & Modul Operasional
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6">
          {apps.map((app, index) => (
            <Link href={app.url} key={index} className="group flex flex-col items-center">
              
              <div className={`
                w-20 h-20 sm:w-26 sm:h-26 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${app.color} 
                flex items-center justify-center text-white mb-3
                shadow-md ${app.shadow} transition-all duration-300 ease-out
                group-hover:-translate-y-1.5 group-hover:scale-105 group-hover:shadow-xl
                ring-1 ring-border/50 inset-ring inset-ring-border/20
              `}>
                <div className="drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                  {app.icon}
                </div>
              </div>
              
              <div className="text-center">
                <h2 className="text-xs sm:text-sm font-bold text-foreground tracking-tight group-hover:text-indigo-600 transition-colors">
                  {app.title}
                </h2>
                <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground mt-0.5">
                  {app.desc}
                </p>
              </div>

            </Link>
          ))}
        </div>
      </div>
      
    </div>
  )
}
