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
  Search, Filter, Plus, Users, ChevronDown, Lock, Wallet, Bell, FolderOpen, Printer, Upload, FileText
} from "lucide-react"

const mockData = [
  { id: "CUST-001", name: "POS Customer", type: "Pelanggan", company: "-", address: "-", email: "-", phone: "-" },
  { id: "VEND-001", name: "Pristine", type: "Vendor", company: "PT Pristine Jaya", address: "Jl. Sudirman No 1", email: "info@pristine.com", phone: "0812345678" },
]

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState("Semua")
  const [search, setSearch] = useState("")
  const [hasData, setHasData] = useState(true) 

  const tabs = ["Semua", "Vendor", "Pegawai", "Pelanggan", "Investor", "Lainnya"]

  const getTypeBadge = (type: string) => {
    switch(type) {
      case "Vendor": return <span className="bg-rose-500 text-white font-medium px-2 py-0.5 rounded text-xs">Vendor</span>
      case "Pegawai": return <span className="bg-teal-500 text-white font-medium px-2 py-0.5 rounded text-xs">Pegawai</span>
      case "Pelanggan": return <span className="bg-blue-500 text-white font-medium px-2 py-0.5 rounded text-xs">Pelanggan</span>
      case "Investor": return <span className="bg-slate-800 text-white font-medium px-2 py-0.5 rounded text-xs">Investor</span>
      case "Lainnya": return <span className="bg-purple-700 text-white font-medium px-2 py-0.5 rounded text-xs">Lainnya</span>
      default: return <span className="bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded text-xs">{type}</span>
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            Kontak
          </h1>
          <p className="text-muted-foreground mt-1">Kelola database pelanggan, vendor, pegawai, dan relasi bisnis Anda.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border">
            <FileText className="h-4 w-4" /> Laporan <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
          </Button>
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border">
            <Plus className="h-4 w-4" /> Grup
          </Button>
          <Link href="/crm/partners/create">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="h-4 w-4" /> Tambah
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
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-card border-l-4 border-l-amber-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex flex-col h-full justify-between gap-2">
            <div className="flex justify-between w-full">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Anda Hutang</p>
              <p className="text-[10px] font-semibold text-amber-500">0 TRANSAKSI</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg"><Lock className="h-4 w-4 text-amber-600" /></div>
              <h3 className="text-lg font-bold text-foreground">0</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-rose-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex flex-col h-full justify-between gap-2">
            <div className="flex justify-between w-full">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Mereka Hutang</p>
              <p className="text-[10px] font-semibold text-rose-500">0 TRANSAKSI</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg"><Lock className="h-4 w-4 text-rose-600" /></div>
              <h3 className="text-lg font-bold text-foreground">0</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-orange-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex flex-col h-full justify-between gap-2">
            <div className="flex justify-between w-full">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Pembayaran diterima</p>
              <p className="text-[10px] font-semibold text-orange-500">0 TRANSAKSI</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg"><Wallet className="h-4 w-4 text-orange-600" /></div>
              <h3 className="text-lg font-bold text-foreground">0</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-indigo-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex flex-col h-full justify-between gap-2">
            <div className="flex justify-between w-full">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Hutang Anda jatuh tempo</p>
              <p className="text-[10px] font-semibold text-indigo-500">0 TRANSAKSI</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg"><Bell className="h-4 w-4 text-indigo-600" /></div>
              <h3 className="text-lg font-bold text-foreground">0</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-fuchsia-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex flex-col h-full justify-between gap-2">
            <div className="flex justify-between w-full">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Hutang mereka jatuh tempo</p>
              <p className="text-[10px] font-semibold text-fuchsia-500">0 TRANSAKSI</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-fuchsia-500/10 rounded-lg"><Bell className="h-4 w-4 text-fuchsia-600" /></div>
              <h3 className="text-lg font-bold text-foreground">0</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-emerald-500 shadow-sm border-t-0 border-r-0 border-b-0 ring-1 ring-border">
          <CardContent className="p-4 flex flex-col h-full justify-between gap-2">
            <div className="flex justify-between w-full">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Pembayaran dikirim</p>
              <p className="text-[10px] font-semibold text-emerald-500">1 TRANSAKSI</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg"><Wallet className="h-4 w-4 text-emerald-600" /></div>
              <h3 className="text-lg font-bold text-foreground">1.800.000</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center -mt-2">
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 text-xs">
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

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari kontak..." 
              className="pl-9 bg-muted border-border h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
            
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-blue-500/10 flex items-center justify-center relative">
                <Users className="h-10 w-10 text-blue-500 absolute" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Belum ada Kontak di sini</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Mulai dengan menambahkan data vendor, pelanggan, atau relasi bisnis Anda.
              </p>
              <Link href="/crm/partners/create">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={() => setHasData(true)}>
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
                      <input type="checkbox" className="rounded border-border text-blue-600 focus:ring-blue-600 bg-card" />
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">Nama</TableHead>
                    <TableHead className="font-semibold text-foreground">Tipe Kontak</TableHead>
                    <TableHead className="font-semibold text-foreground">Perusahaan</TableHead>
                    <TableHead className="font-semibold text-foreground">Alamat</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Telepon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockData.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 border-border group cursor-pointer">
                      <TableCell className="text-center">
                        <input type="checkbox" className="rounded border-border text-blue-600 focus:ring-blue-600 bg-card opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity" />
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">{item.name}</TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                      <TableCell className="text-muted-foreground">{item.company}</TableCell>
                      <TableCell className="text-muted-foreground">{item.address}</TableCell>
                      <TableCell className="text-muted-foreground">{item.email}</TableCell>
                      <TableCell className="text-muted-foreground">{item.phone}</TableCell>
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
