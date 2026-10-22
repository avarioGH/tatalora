"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { 
  ShoppingCart, Box, TrendingUp, MonitorSmartphone, 
  Truck, Users, UserCheck, BarChart3, Wallet, Settings
} from "lucide-react"

export default function HomeLauncher() {
  const [userName, setUserName] = useState("Admin")

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
  }, [])

  const apps = [
    { 
      title: "Penjualan", 
      desc: "Overview & Tagihan", 
      url: "/sales/overview", 
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

  return (
    <div className="w-full flex flex-col items-center pt-2 sm:pt-6 pb-12 px-2 sm:px-6">
      
      <div className="text-center mb-8 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-2 sm:mb-3">
          TATALORA Workspace
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Selamat datang kembali, <span className="font-semibold text-foreground">{userName}</span>. Apa yang ingin Anda kerjakan hari ini?
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 max-w-6xl w-full">
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
  )
}
