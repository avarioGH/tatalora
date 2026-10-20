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
  Search, Filter, Download, Plus, Truck, FileText, ChevronDown, Calendar, FolderOpen
} from "lucide-react"

// Mock Data
const mockDeliveries = [
  { id: "DO-2026-001", customer: "PT ABC Teknologi", ref: "INV/2026/001", date: "10 Okt 2026", status: "Selesai" },
  { id: "DO-2026-002", customer: "CV Maju Bersama", ref: "INV/2026/002", date: "12 Okt 2026", status: "Terkirim" },
  { id: "DO-2026-003", customer: "Toko Sejahtera", ref: "INV/2026/004", date: "15 Okt 2026", status: "Open" },
]

export default function DeliveriesPage() {
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  // Change to true to see data, false to see empty state
  const [hasData, setHasData] = useState(false) 

  const tabs = ["Semua", "Open", "Selesai", "Terkirim", "Batal"]

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Open": return <Badge className="bg-amber-500/100/10 text-amber-700 hover:bg-amber-500/100/10 border-0 shadow-none font-medium px-2.5 py-0.5">Open</Badge>
      case "Terkirim": return <Badge className="bg-blue-500/100/10 text-blue-700 hover:bg-blue-500/100/10 border-0 shadow-none font-medium px-2.5 py-0.5">Terkirim</Badge>
      case "Selesai": return <Badge className="bg-emerald-500/100/10 text-emerald-700 hover:bg-emerald-500/100/10 border-0 shadow-none font-medium px-2.5 py-0.5">Selesai</Badge>
      case "Batal": return <Badge className="bg-rose-500/100/10 text-rose-700 hover:bg-rose-500/100/10 border-0 shadow-none font-medium px-2.5 py-0.5">Batal</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-500/100/10 rounded-lg">
              <Truck className="h-6 w-6 text-indigo-600" />
            </div>
            Pengiriman
          </h1>
          <p className="text-muted-foreground mt-1">Kelola surat jalan dan status pengiriman barang ke pelanggan.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-muted-foreground border-border">
            <FileText className="h-4 w-4" /> Laporan <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-muted-foreground border-border hidden md:flex">
            <Download className="h-4 w-4" /> Ekspor
          </Button>
          <Link href="/sales/deliveries/create">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="h-4 w-4" /> Pengiriman Baru
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden">
        {/* Filter Bar */}
        <div className="bg-card p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Action Left */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" className="gap-2 text-muted-foreground border-border">
              <Filter className="h-4 w-4 text-muted-foreground" /> Filter
            </Button>
            <div className="h-9 px-3 flex items-center border border-border rounded-md bg-muted text-sm font-medium text-muted-foreground cursor-pointer">
              Status Pengiriman <ChevronDown className="h-3 w-3 ml-2 text-muted-foreground" />
            </div>
          </div>

          {/* Search & Date Right */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari no. pengiriman, nama..." 
                className="pl-9 bg-muted border-border h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="hidden lg:flex h-9 px-3 items-center border border-border rounded-md bg-muted text-sm text-muted-foreground cursor-pointer whitespace-nowrap">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              10 Okt 2026 - 10 Nov 2026
            </div>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="bg-background px-4 pt-3 border-b border-border flex gap-1 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap
                ${activeTab === tab 
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-500/10/50' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        <CardContent className="p-0 bg-card">
          {!hasData ? (
            
            /* Empty State (TATALORA Style) */
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-indigo-500/10 flex items-center justify-center relative">
                <FolderOpen className="h-10 w-10 text-indigo-400 absolute" />
                <div className="w-4 h-4 bg-emerald-400 rounded-full absolute -top-1 -right-1 border-2 border-white"></div>
                <div className="w-3 h-3 bg-amber-400 rounded-full absolute bottom-2 -left-2 border-2 border-white"></div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Belum ada Pengiriman</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Anda belum memiliki riwayat pengiriman barang saat ini. Silakan buat pengiriman baru dari Surat Jalan atau Invoice.
              </p>
              <Link href="/sales/deliveries/create">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  <Plus className="h-4 w-4 mr-2" /> Buat Pengiriman Pertama
                </Button>
              </Link>
            </div>

          ) : (

            /* Data Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted border-border">
                    <TableHead className="w-12 text-center">
                      <input type="checkbox" className="rounded border-border text-indigo-600 focus:ring-indigo-600" />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">Nomor Pengiriman</TableHead>
                    <TableHead className="font-semibold text-foreground">Pelanggan</TableHead>
                    <TableHead className="font-semibold text-foreground">Referensi</TableHead>
                    <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDeliveries.map((item) => (
                    <TableRow key={item.id} className="hover:bg-background border-border group cursor-pointer">
                      <TableCell className="text-center">
                        <input type="checkbox" className="rounded border-border text-indigo-600 focus:ring-indigo-600 opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity" />
                      </TableCell>
                      <TableCell className="font-semibold text-indigo-600">{item.id}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.customer}</TableCell>
                      <TableCell className="text-muted-foreground">{item.ref}</TableCell>
                      <TableCell className="text-muted-foreground">{item.date}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
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



