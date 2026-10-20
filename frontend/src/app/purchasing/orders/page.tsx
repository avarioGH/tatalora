"use client"

import React, { useState } from "react"
import Link from "next/link"
import { 
  Card, CardContent
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, Filter, Plus, ShoppingCart, FileText, ChevronDown, Calendar, FolderOpen, Printer, Upload
} from "lucide-react"

const mockData = [
  { id: "PO-2026-001", vendor: "PT Surya Kayu", ref: "PR-001", qty: 150, undelivered: 0, warehouse: "Gudang Utama", date: "10 Okt 2026", due: "10 Nov 2026", term: "Net 30", status: "Selesai", payment: "Lunas" },
  { id: "PO-2026-002", vendor: "CV Logam Abadi", ref: "PR-002", qty: 45, undelivered: 45, warehouse: "Gudang Cabang", date: "12 Okt 2026", due: "12 Nov 2026", term: "Net 30", status: "Disetujui", payment: "Belum Dibayar" },
]

export default function PurchaseOrdersPage() {
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [hasData, setHasData] = useState(false) 

  const tabs = ["Semua", "Draft", "Disetujui", "Dikirim Sebagian", "Selesai", "Lainnya"]

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Disetujui": return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-0 shadow-none font-medium px-2.5 py-0.5">Disetujui</Badge>
      case "Selesai": return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 shadow-none font-medium px-2.5 py-0.5">Selesai</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentBadge = (status: string) => {
    switch(status) {
      case "Belum Dibayar": return <span className="text-rose-500 font-medium text-xs">{status}</span>
      case "Lunas": return <span className="text-emerald-500 font-medium text-xs">{status}</span>
      default: return <span className="text-muted-foreground font-medium text-xs">{status}</span>
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            Pesanan Pembelian
          </h1>
          <p className="text-muted-foreground mt-1">Kelola pesanan ke supplier (Purchase Order).</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border">
            <FileText className="h-4 w-4" /> Laporan <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="h-4 w-4" /> Tambah
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border hidden md:flex">
            <Upload className="h-4 w-4" /> Import <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border hidden lg:flex">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" className="gap-2 text-foreground border-border bg-card">
              <Filter className="h-4 w-4 text-muted-foreground" /> Filter
            </Button>
            <div className="h-9 px-3 flex items-center border border-border rounded-md bg-muted text-sm font-medium text-foreground cursor-pointer">
              Pesanan Pembelian <ChevronDown className="h-3 w-3 ml-2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari pesanan..." 
                className="pl-9 bg-muted border-border h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="hidden lg:flex h-9 px-3 items-center border border-border rounded-md bg-muted text-sm text-foreground cursor-pointer whitespace-nowrap">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              10 Okt 2025 - 10 Okt 2026
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-muted/30 px-4 pt-3 border-b border-border flex gap-1 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap
                ${activeTab === tab 
                  ? 'border-blue-600 text-blue-600 bg-blue-500/10' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {!hasData ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-blue-500/10 flex items-center justify-center relative">
                <FolderOpen className="h-10 w-10 text-blue-500 absolute" />
                <div className="w-4 h-4 bg-emerald-400 rounded-full absolute -top-1 -right-1 border-2 border-card"></div>
                <div className="w-3 h-3 bg-amber-400 rounded-full absolute bottom-2 -left-2 border-2 border-card"></div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Belum ada Pesanan Pembelian di sini</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Mulai dengan membuat Purchase Order (PO) untuk dikirim ke vendor Anda.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => setHasData(true)}>
                <Plus className="h-4 w-4 mr-2" /> Tambah Pesanan Pembelian
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="w-12 text-center">
                      <input type="checkbox" className="rounded border-border text-blue-600 focus:ring-blue-600 bg-card" />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Nomor</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Vendor</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Referensi</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Kuantitas</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Belum Dikirim</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Nama Gudang</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Tgl. Jatuh Tempo</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap">Termin</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Status</TableHead>
                    <TableHead className="font-semibold text-foreground whitespace-nowrap text-center">Status Pembayaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 border-border group cursor-pointer">
                      <TableCell className="text-center">
                        <input type="checkbox" className="rounded border-border text-blue-600 focus:ring-blue-600 bg-card opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity" />
                      </TableCell>
                      <TableCell className="font-semibold text-blue-600">{item.id}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.vendor}</TableCell>
                      <TableCell className="text-muted-foreground">{item.ref}</TableCell>
                      <TableCell className="text-muted-foreground text-center">{item.qty}</TableCell>
                      <TableCell className="text-muted-foreground text-center">{item.undelivered}</TableCell>
                      <TableCell className="text-muted-foreground">{item.warehouse}</TableCell>
                      <TableCell className="text-muted-foreground">{item.date}</TableCell>
                      <TableCell className="text-muted-foreground">{item.due}</TableCell>
                      <TableCell className="text-muted-foreground">{item.term}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-center">{getPaymentBadge(item.payment)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
