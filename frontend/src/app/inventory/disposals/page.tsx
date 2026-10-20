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
  Search, Plus, Flame, Filter, ChevronDown, FolderOpen
} from "lucide-react"

const mockData = [
  { id: "DS-2026-001", date: "10 Okt 2026", product: "Semen Portland 50kg", warehouse: "Gudang Utama", qty: 2, unit: "Sak", reason: "Rusak terkena air", status: "Selesai" },
  { id: "DS-2026-002", date: "09 Okt 2026", product: "Kayu Jati Merah", warehouse: "Gudang Cabang", qty: 0.5, unit: "M3", reason: "Cacat produksi", status: "Menunggu Persetujuan" },
]

export default function DisposalsPage() {
  const [search, setSearch] = useState("")

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Selesai": return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 font-medium px-2.5 py-0.5">Selesai</Badge>
      case "Menunggu Persetujuan": return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-0 font-medium px-2.5 py-0.5">Menunggu Persetujuan</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Flame className="h-6 w-6 text-rose-600" />
            </div>
            Pemusnahan Stok
          </h1>
          <p className="text-muted-foreground mt-1">Catat dan pantau barang yang dimusnahkan karena rusak atau kedaluwarsa.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-sm w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Catat Pemusnahan
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20">
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <Button variant="outline" className="gap-2 text-foreground border-border bg-card">
              <Filter className="h-4 w-4 text-muted-foreground" /> Filter
            </Button>
            <div className="h-9 px-3 flex items-center border border-border rounded-md bg-card text-sm font-medium text-foreground cursor-pointer shadow-sm">
              Semua Gudang <ChevronDown className="h-3 w-3 ml-2 text-muted-foreground" />
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari referensi atau produk..." 
              className="pl-9 bg-card border-border h-9 text-sm shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                  <TableHead className="font-semibold text-foreground pl-6">Referensi</TableHead>
                  <TableHead className="font-semibold text-foreground">Tanggal</TableHead>
                  <TableHead className="font-semibold text-foreground">Produk</TableHead>
                  <TableHead className="font-semibold text-foreground">Gudang</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">Kuantitas</TableHead>
                  <TableHead className="font-semibold text-foreground">Alasan</TableHead>
                  <TableHead className="font-semibold text-foreground text-center pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 border-border transition-colors">
                    <TableCell className="font-medium text-rose-600 pl-6">{item.id}</TableCell>
                    <TableCell className="text-muted-foreground">{item.date}</TableCell>
                    <TableCell className="font-medium text-foreground">{item.product}</TableCell>
                    <TableCell className="text-muted-foreground">{item.warehouse}</TableCell>
                    <TableCell className="text-foreground font-semibold text-center">
                      {item.qty} <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{item.reason}</TableCell>
                    <TableCell className="text-center pr-6">{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
