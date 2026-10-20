"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, ShoppingCart, Truck, Receipt, FileSpreadsheet, Package, Users, Wallet
} from "lucide-react"

export default function ReportsHubPage() {
  const router = useRouter()

  const reportModules = [
    {
      title: "Laporan Penjualan",
      description: "Analisis performa penjualan, tagihan, dan tren pemesanan.",
      icon: <TrendingUp className="w-8 h-8 text-indigo-500" />,
      href: "/reports/sales",
      color: "bg-indigo-50 border-indigo-200"
    },
    {
      title: "Laporan Pembelian",
      description: "Ringkasan pengadaan barang, performa pemasok, dan utang.",
      icon: <ShoppingCart className="w-8 h-8 text-emerald-500" />,
      href: "/purchasing/overview", // Or /reports/purchasing
      color: "bg-emerald-50 border-emerald-200"
    },
    {
      title: "Laporan Persediaan",
      description: "Mutasi stok, valuasi aset, dan barang hampir habis.",
      icon: <Package className="w-8 h-8 text-amber-500" />,
      href: "/reports/inventory",
      color: "bg-amber-50 border-amber-200"
    },
    {
      title: "Laporan Keuangan",
      description: "Arus kas, laba rugi, dan neraca saldo perusahaan.",
      icon: <Wallet className="w-8 h-8 text-rose-500" />,
      href: "/reports/finance",
      color: "bg-rose-50 border-rose-200"
    }
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pusat Laporan</h1>
        <p className="text-muted-foreground">Pilih modul laporan untuk melihat analitik dan mengunduh data perusahaan Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {reportModules.map((mod, idx) => (
          <Card 
            key={idx} 
            className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${mod.color}`}
            onClick={() => router.push(mod.href)}
          >
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                {mod.icon}
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-semibold text-lg">{mod.title}</h3>
                <p className="text-sm text-slate-600 leading-snug">{mod.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
