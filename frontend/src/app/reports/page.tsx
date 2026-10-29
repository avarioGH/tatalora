"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  TrendingUp, ShoppingCart, Truck, Receipt, FileSpreadsheet, 
  Package, Users, Wallet, Search, Landmark, FileText, ArrowRight,
  PieChart, BarChart3, ChevronRight, Layers, DollarSign, Building2,
  Boxes, ShieldAlert, BadgeCheck
} from "lucide-react"

interface ReportItem {
  id: string
  title: string
  description: string
  href: string
  badge?: string
}

interface ReportCategory {
  id: string
  name: string
  reports: ReportItem[]
}

export default function ReportsHubPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const categories: ReportCategory[] = [
    {
      id: "sekilas-bisnis",
      name: "Sekilas bisnis",
      reports: [
        {
          id: "neraca",
          title: "Neraca",
          description: "Menampilkan apa yang dimiliki (aset), apa saja utangnya (liabilitas), dan apa yang sudah diinvestasikan ke perusahaan ini (ekuitas) pada tanggal tertentu.",
          href: "/finance/balance-sheet",
        },
        {
          id: "buku-besar",
          title: "Buku besar",
          description: "Menampilkan semua transaksi berdasarkan akun dalam periode tertentu, termasuk kronologi pergerakan transaksinya selama periode berlangsung.",
          href: "/finance/general-ledger",
        },
        {
          id: "laba-rugi",
          title: "Laba rugi",
          description: "Menampilkan semua pendapatan yang diperoleh dan biaya yang dikeluarkan dalam periode tertentu untuk mengetahui kinerja laba bersih perusahaan.",
          href: "/reports/profit",
        },
        {
          id: "jurnal",
          title: "Jurnal",
          description: "Menampilkan semua journal entry per transaksi dalam periode tertentu. Anda dapat melacak transaksi yang masuk ke masing-masing akun debit & kredit.",
          href: "/finance/journal-entries",
        },
        {
          id: "arus-kas",
          title: "Arus kas",
          description: "Menampilkan pergerakan uang masuk dan keluar dari aktivitas operasi, investasi, dan pendanaan perusahaan secara akurat.",
          href: "/finance/cash-flow",
        },
        {
          id: "neraca-saldo",
          title: "Neraca saldo",
          description: "Menampilkan saldo dari setiap akun, termasuk saldo awal, pergerakan debit kredit, dan saldo akhir dalam periode buku.",
          href: "/finance/trial-balance",
        },
      ]
    },
    {
      id: "penjualan",
      name: "Penjualan",
      reports: [
        {
          id: "laporan-penjualan",
          title: "Laporan Penjualan",
          description: "Daftar ringkasan dan rincian transaksi penjualan, status invoice, omzet per produk, dan tren pemesanan pelanggan.",
          href: "/reports/sales",
        },
        {
          id: "piutang-pelanggan",
          title: "Daftar Piutang Pelanggan",
          description: "Lacak seluruh piutang usaha yang belum tertagih lengkap dengan umur piutang (aging receivables).",
          href: "/sales/invoices",
        },
        {
          id: "pesanan-penjualan",
          title: "Pesanan Penjualan (Sales Order)",
          description: "Status realisasi pesanan penjualan pelanggan dari quotation hingga pengiriman surat jalan.",
          href: "/sales/orders",
        },
      ]
    },
    {
      id: "pembelian",
      name: "Pembelian",
      reports: [
        {
          id: "laporan-pembelian",
          title: "Laporan Pembelian",
          description: "Ringkasan pengadaan barang dari supplier, analisis belanja per kategori barang, dan performa vendor.",
          href: "/reports/purchasing",
        },
        {
          id: "utang-pemasok",
          title: "Daftar Utang Pemasok",
          description: "Daftar tagihan vendor yang jatuh tempo dan belum dibayar untuk menjaga arus kas perusahaan.",
          href: "/purchasing/bills",
        },
        {
          id: "pesanan-pembelian",
          title: "Pesanan Pembelian (Purchase Order)",
          description: "Lacak status penerimaan barang fisik terhadap purchase order (PO) yang telah diterbitkan.",
          href: "/purchasing/orders",
        },
      ]
    },
    {
      id: "produk",
      name: "Produk & Inventori",
      reports: [
        {
          id: "laporan-persediaan",
          title: "Ringkasan Persediaan Barang",
          description: "Valuasi nilai total aset inventori di seluruh gudang, stok on-hand, dan batas stok minimum.",
          href: "/reports/stock",
        },
        {
          id: "mutasi-stok",
          title: "Kartu Stok & Mutasi Barang",
          description: "Riwayat keluar masuk fisik barang per transaksi gudang untuk audit kepatuhan stok opname.",
          href: "/inventory/stock",
        },
        {
          id: "disposal-penyesuaian",
          title: "Penyesuaian & Pemusnahan Stok",
          description: "Catatan penyesuaian kuantitas fisik, stock loss, maupun barang rusak/disposal.",
          href: "/inventory/disposals",
        },
      ]
    },
    {
      id: "aset",
      name: "Aset",
      reports: [
        {
          id: "daftar-aset-tetap",
          title: "Daftar Aset Tetap",
          description: "Daftar aktiva tetap perusahaan, tanggal perolehan, masa manfaat, dan metode depresiasi.",
          href: "/assets",
        },
        {
          id: "penyusutan-aset",
          title: "Laporan Penyusutan Aset",
          description: "Jadwal dan akumulasi penyusutan aset tetap per bulan dan per tahun anggaran.",
          href: "/assets",
        },
      ]
    },
    {
      id: "bank",
      name: "Bank & Kas",
      reports: [
        {
          id: "rekening-koran",
          title: "Mutasi Kas & Rekening Koran",
          description: "Riwayat arus penerimaan kas, pengeluaran kas operasional, dan transfer antar akun bank.",
          href: "/cash-bank",
        },
        {
          id: "rekonsiliasi-bank",
          title: "Rekonsiliasi Bank",
          description: "Penyamaan saldo buku catatan kas perusahaan dengan mutasi rekening bank secara otomatis.",
          href: "/cash-bank",
        },
      ]
    },
    {
      id: "produksi",
      name: "Produksi",
      reports: [
        {
          id: "perintah-kerja",
          title: "Laporan Perintah Kerja (Work Order)",
          description: "Proses produksi bertahap, alokasi bahan baku (BOM), dan penghitungan biaya produksi (HPP).",
          href: "/production/sawmill",
          badge: "Khusus",
        },
        {
          id: "rendemen-kayu",
          title: "Rendemen Sawmill & Log Kayu",
          description: "Kalkulasi rasio rendemen kayu bulat ke papan sawn timber, kubikasi, dan sisa bahan.",
          href: "/production/sawmill",
          badge: "Sawmill",
        },
      ]
    }
  ]

  // Filter reports according to activeTab and searchQuery
  const filteredCategories = categories
    .map(category => {
      // If a specific tab is selected, only keep matching category
      if (activeTab !== "all" && category.id !== activeTab) {
        return null
      }
      
      const filteredReports = category.reports.filter(rep => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return rep.title.toLowerCase().includes(q) || rep.description.toLowerCase().includes(q)
      })

      if (filteredReports.length === 0) return null

      return {
        ...category,
        reports: filteredReports
      }
    })
    .filter(Boolean) as ReportCategory[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Laporan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pusat analitik dan laporan keuangan, penjualan, pembelian, serta operasional bisnis Anda.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Cari laporan..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border text-foreground text-sm"
          />
        </div>
      </div>

      {/* Tabs Menu - Mekari Jurnal Style */}
      <div className="border-b border-border overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 sm:gap-2 min-w-max pb-px">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua Laporan
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === cat.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Report Cards Grid by Category */}
      <div className="space-y-8 pt-2">
        {filteredCategories.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm">Tidak ada laporan yang cocok dengan pencarian "{searchQuery}".</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="space-y-4">
              {activeTab === "all" && (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">{category.name}</h2>
                  <div className="h-px bg-border flex-1" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.reports.map((report) => (
                  <Card 
                    key={report.id}
                    className="bg-card hover:border-primary/50 transition-all shadow-xs hover:shadow-sm group border-border"
                  >
                    <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">
                            {report.title}
                          </h3>
                          {report.badge && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {report.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {report.description}
                        </p>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(report.href)}
                          className="border-primary/30 text-primary hover:bg-primary/5 hover:text-primary font-semibold text-xs rounded-lg flex items-center gap-1.5"
                        >
                          <span>Lihat laporan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
