"use client"

import React, { useState } from "react"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, HelpCircle, BookOpen, ChevronDown, ChevronUp, 
  FileText, ArrowRight, ShieldCheck, CheckCircle2, ShoppingCart, 
  Truck, Receipt, Wallet, Layers, Sparkles
} from "lucide-react"
import Link from "next/link"

interface FAQItem {
  q: string
  a: string
  category: string
  href?: string
}

export default function FAQPage() {
  const [search, setSearch] = useState("")
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [selectedCategory, setSelectedCategory] = useState("Semua")

  const categories = ["Semua", "Penjualan", "Pembelian", "Kas & Bank", "Akuntansi & Laporan", "Inventori & Gudang"]

  const faqs: FAQItem[] = [
    {
      category: "Penjualan",
      q: "Bagaimana alur transaksi penjualan dari Penawaran (SQ) hingga Pembayaran?",
      a: "Alur standar di Tatalora mengikuti rantai proses: Penawaran Penjualan (Sales Quotation / SQ) diajukan ke pelanggan → setelah disetujui, dikonfirmasi menjadi Pesanan Penjualan (Sales Order / SO) → dibuatkan Surat Jalan Pengiriman (Delivery Order / DO) untuk memotong stok fisik → diterbitkan Faktur Penjualan (Sales Invoice) untuk mengakui piutang usaha → dicatat Pembayaran (Payment Receipt) untuk melunasi tagihan di Kas/Bank.",
      href: "/sales/quotations"
    },
    {
      category: "Penjualan",
      q: "Bagaimana cara menerapkan diskon dan pajak (PPN 11%/12%) pada transaksi?",
      a: "Diskon dapat diterapkan per baris (persen/nominal) atau diskon global tambahan. PPN (11% atau 12%) secara otomatis dihitung berdasarkan Dasar Pengenaan Pajak (DPP) setelah diskon, dan otomatis dijumlahkan ke Total Tagihan serta dijurnalkan ke akun Hutang PPN Keluaran.",
      href: "/sales/invoices/create"
    },
    {
      category: "Pembelian",
      q: "Apa perbedaan antara Permintaan Pembelian (PR), Penawaran Vendor (RFQ), dan Pesanan Pembelian (PO)?",
      a: "PR (Purchase Request) adalah pengajuan internal dari divisi/gudang untuk pengadaan barang. RFQ (Request for Quotation) digunakan untuk meminta perbandingan harga dan termin ke supplier. PO (Purchase Order) adalah pesanan resmi yang diterbitkan kepada supplier terpilih sebelum barang diterima fisik.",
      href: "/purchasing/orders"
    },
    {
      category: "Pembelian",
      q: "Kapan hutang usaha (AP) diakui dalam sistem?",
      a: "Hutang usaha secara otomatis diakui ke neraca dan laporan umur utang saat Faktur Pembelian (Vendor Bill / Purchase Invoice) dibuat dan berstatus POSTED/TERBIT.",
      href: "/purchasing/invoices"
    },
    {
      category: "Kas & Bank",
      q: "Bagaimana cara melakukan rekonsiliasi mutasi kas dengan buku besar?",
      a: "Buka menu Kas & Bank → Rekonsiliasi Kas. Sistem akan membandingkan saldo operasional kas (dari mutasi penerimaan/pengeluaran) dengan saldo pada buku besar (General Ledger) untuk mendeteksi selisih secara otomatis.",
      href: "/finance/cash-reconciliation"
    },
    {
      category: "Akuntansi & Laporan",
      q: "Di mana saya bisa melihat Neraca Saldo (Trial Balance) dan Buku Besar (General Ledger)?",
      a: "Buku besar terperinci dapat diakses melalui menu Keuangan → General Ledger (/finance/gl). Neraca Saldo lengkap dengan pergerakan saldo debit dan kredit akun dapat diakses melalui Pusat Laporan → Neraca Saldo (/finance/trial-balance).",
      href: "/finance/trial-balance"
    },
    {
      category: "Inventori & Gudang",
      q: "Bagaimana cara melacak histori keluar-masuk stok barang?",
      a: "Anda dapat memantau saldo akhir di menu Stok (/inventory/stock), atau meninjau seluruh mutasi fisik per transaksi gudang (hasil repacking, pembelian nelayan, penjualan POS, pengiriman sales, transfer gudang, penyesuaian opname) di menu Mutasi Stok (/inventory/movements).",
      href: "/inventory/movements"
    },
    {
      category: "Inventori & Gudang",
      q: "Bagaimana kebijakan sistem jika stok barang minus atau negatif?",
      a: "Sistem memberikan indikator visual pada master produk dan laporan stok jika ada persediaan negatif agar segera dilakukan stok opname atau pencatatan penerimaan fisik.",
      href: "/inventory/products"
    }
  ]

  const filteredFaqs = faqs.filter(item => {
    const matchCat = selectedCategory === "Semua" || item.category === selectedCategory
    const q = search.toLowerCase()
    const matchSearch = item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <HelpCircle className="w-4 h-4" /> Pusat Bantuan & FAQ Tatalora
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
          Pertanyaan yang Sering Diajukan
        </h1>
        <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
          Panduan operasional alur penjualan, pembelian, pembukuan kas, inventori gudang, dan laporan akuntansi standar.
        </p>
        
        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto pt-2">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Cari pertanyaan, istilah akuntansi, atau menu..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-11 h-12 text-sm md:text-base rounded-xl shadow-sm border-slate-300"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className="rounded-full text-xs font-medium"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Accordion FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            Tidak ditemukan jawaban yang cocok dengan pencarian &quot;{search}&quot;. Silakan gunakan kata kunci lain atau hubungi tim teknis kami.
          </Card>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <Card 
                key={idx} 
                className={`transition-all border ${isOpen ? 'border-indigo-200 shadow-sm bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 hover:text-indigo-600"
                >
                  <span className="flex items-center gap-3 text-base">
                    <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <CardContent className="px-5 pb-5 pt-0 text-sm text-slate-600 space-y-4 border-t border-indigo-100/60 mt-2 pt-4">
                    <p className="leading-relaxed">{faq.a}</p>
                    {faq.href && (
                      <Link 
                        href={faq.href}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        Buka Halaman Terkait <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Footer Banner */}
      <Card className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-300" /> Butuh Bantuan Tambahan?
          </h3>
          <p className="text-xs text-indigo-200 mt-1">
            Gunakan Asisten AI Tatalora di pojok kanan bawah untuk bertanya seputar transaksi dan pembukuan Anda secara instan.
          </p>
        </div>
        <Link href="/reports">
          <Button variant="secondary" size="sm" className="shrink-0 font-semibold cursor-pointer">
            Lihat Katalog Laporan
          </Button>
        </Link>
      </Card>
    </div>
  )
}
