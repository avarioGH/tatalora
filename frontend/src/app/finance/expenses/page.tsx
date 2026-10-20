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
  Search, Filter, Plus, Receipt, FileText, ChevronDown, Calendar, FolderOpen, Printer, Upload, Clock, Bell, Wallet
} from "lucide-react"

const mockData = [
  { id: "EXP-2026-001", date: "10 Okt 2026", ref: "Listrik Gudang", payee: "PLN", status: "Lunas", unpaid: 0, total: "Rp 2.500.000" },
  { id: "EXP-2026-002", date: "12 Okt 2026", ref: "Sewa Forklift", payee: "Rental Jaya", status: "Belum Dibayar", unpaid: "Rp 1.500.000", total: "Rp 1.500.000" },
]

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [hasData, setHasData] = useState(false) 

  const tabs = ["Semua", "Belum Dibayar", "Dibayar Sebagian", "Lunas", "Lainnya"]

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Belum Dibayar": return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-0 shadow-none font-medium px-2.5 py-0.5">Belum Dibayar</Badge>
      case "Dibayar Sebagian": return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-0 shadow-none font-medium px-2.5 py-0.5">Dibayar Sebagian</Badge>
      case "Lunas": return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 shadow-none font-medium px-2.5 py-0.5">Lunas</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Receipt className="h-6 w-6 text-violet-600" />
            </div>
            Biaya
          </h1>
          <p className="text-muted-foreground mt-1">Kelola dan pantau seluruh pengeluaran operasional perusahaan.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border">
            <FileText className="h-4 w-4" /> Laporan <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
          </Button>
          <Link href="/finance/expenses/create">
            <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm">
              <Plus className="h-4 w-4" /> Tambah Biaya
            </Button>
          </Link>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border hidden md:flex">
            <Upload className="h-4 w-4" /> Import <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border hidden lg:flex">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-l-4 border-l-amber-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Bulan Ini</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg"><Receipt className="h-4 w-4 text-amber-600" /></div>
                <h3 className="text-xl font-bold text-foreground">0</h3>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full uppercase tracking-wider">0 Transaksi</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-rose-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">30 Hari Lalu</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 rounded-lg"><Clock className="h-4 w-4 text-rose-600" /></div>
                <h3 className="text-xl font-bold text-foreground">0</h3>
              </div>
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-1 rounded-full uppercase tracking-wider">0 Transaksi</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-indigo-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Belum Dibayar</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg"><Wallet className="h-4 w-4 text-indigo-600" /></div>
                <h3 className="text-xl font-bold text-foreground">0</h3>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-500/10 px-2 py-1 rounded-full uppercase tracking-wider">0 Transaksi</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-emerald-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Jatuh Tempo</p>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg"><Bell className="h-4 w-4 text-emerald-600" /></div>
                <h3 className="text-xl font-bold text-foreground">0</h3>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-wider">0 Transaksi</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center -mt-2">
        <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 text-xs">
          Lihat Selengkapnya <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" className="gap-2 text-foreground border-border bg-card">
              <Filter className="h-4 w-4 text-muted-foreground" /> Filter
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari biaya..." 
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

        {/* Custom Tabs */}
        <div className="bg-muted/30 px-4 pt-3 border-b border-border flex gap-1 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap
                ${activeTab === tab 
                  ? 'border-violet-600 text-violet-600 bg-violet-500/10' 
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
            
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-violet-500/10 flex items-center justify-center relative">
                <FolderOpen className="h-10 w-10 text-violet-500 absolute" />
                <div className="w-4 h-4 bg-emerald-400 rounded-full absolute -top-1 -right-1 border-2 border-card"></div>
                <div className="w-3 h-3 bg-amber-400 rounded-full absolute bottom-2 -left-2 border-2 border-card"></div>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Belum ada data di sini</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Mulai dengan menambahkan pengeluaran atau biaya operasional baru.
              </p>
              <Link href="/finance/expenses/create">
                <Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm" onClick={() => setHasData(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Tambah
                </Button>
              </Link>
            </div>

          ) : (

            /* Data Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="w-12 text-center">
                      <input type="checkbox" className="rounded border-border text-violet-600 focus:ring-violet-600 bg-card" />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                    <TableHead className="font-semibold text-foreground">Nomor</TableHead>
                    <TableHead className="font-semibold text-foreground">Referensi</TableHead>
                    <TableHead className="font-semibold text-foreground">Penerima</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Sisa Tagihan</TableHead>
                    <TableHead className="font-semibold text-foreground text-right pr-6">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 border-border group cursor-pointer">
                      <TableCell className="text-center">
                        <input type="checkbox" className="rounded border-border text-violet-600 focus:ring-violet-600 bg-card opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.date}</TableCell>
                      <TableCell className="font-semibold text-violet-600">{item.id}</TableCell>
                      <TableCell className="text-muted-foreground">{item.ref}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.payee}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-rose-500 font-medium text-right">{item.unpaid !== 0 ? item.unpaid : '-'}</TableCell>
                      <TableCell className="text-foreground font-semibold text-right pr-6">{item.total}</TableCell>
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
