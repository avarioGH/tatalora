"use client"

import React from "react"
import Link from "next/link"
import { 
  Card, CardContent
} from "@/components/ui/card"
import { 
  FileClock, Percent, Tag, Box, Truck, Grip, Settings2, Bookmark, DownloadCloud, MonitorX
} from "lucide-react"

const settingsMenu = [
  {
    category: "TRANSAKSI & PEMBAYARAN",
    items: [
      { title: "Termin", description: "Atur data termin pembayaran", icon: FileClock, url: "/settings/master-data/terms" },
      { title: "Pajak", description: "Atur pajak", icon: Percent, url: "/settings/master-data/taxes" },
      { title: "Biaya Transaksi", description: "Atur biaya transaksi penjualan dan pembelian", icon: Tag, url: "/settings/master-data/fees" },
    ]
  },
  {
    category: "PRODUK & PENGIRIMAN",
    items: [
      { title: "Satuan", description: "Atur satuan produk", icon: Box, url: "/settings/master-data/units" },
      { title: "Ekspedisi", description: "Atur perusahaan ekspedisi", icon: Truck, url: "/settings/master-data/shipping" },
      { title: "Varian Produk", description: "Atur varian produk", icon: Grip, url: "/settings/master-data/variants" },
      { title: "Modifier Produk", description: "Atur modifier produk", icon: Settings2, url: "/settings/master-data/modifiers" },
    ]
  },
  {
    category: "ORGANISASI & DATA",
    items: [
      { title: "Tags", description: "Atur tag untuk pemisahan laporan cabang/departemen/divisi", icon: Bookmark, url: "/settings/master-data/tags" },
      { title: "Backup Database", description: "Mengunduh database sistem Anda", icon: DownloadCloud, url: "/settings/master-data/backup" },
    ]
  },
  {
    category: "LAINNYA",
    items: [
      { title: "Setup", description: "Hapus data demo dan mulai dari awal", icon: MonitorX, url: "/settings/master-data/setup" },
    ]
  }
]

export default function MasterDataPage() {
  return (
    <div className="p-6 md:p-8 space-y-8 bg-background min-h-screen max-w-[1200px] mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Data Master
        </h1>
        <p className="text-muted-foreground mt-1">Atur data dasar seperti pajak, termin, satuan, dan tags untuk transaksi</p>
      </div>

      <div className="space-y-10">
        {settingsMenu.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground tracking-widest uppercase">
              {section.category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items.map((item, itemIdx) => (
                <Link href={item.url} key={itemIdx}>
                  <Card className="border border-border hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer bg-card group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-indigo-500/10 transition-colors">
                        <item.icon className="w-6 h-6 text-blue-500 group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
