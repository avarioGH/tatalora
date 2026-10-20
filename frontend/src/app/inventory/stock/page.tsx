"use client"

import React, { useState } from "react"
import Link from "next/link"
import { 
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, Filter, Package, ChevronDown, Download, Layers, AlertCircle
} from "lucide-react"

const mockStock = [
  { id: "PRD-001", product: "Besi Beton 10mm", sku: "BB-10-STD", warehouse: "Gudang Utama", qty: 1250, unit: "Btg", status: "Tersedia" },
  { id: "PRD-002", product: "Semen Portland 50kg", sku: "SM-PT-50", warehouse: "Gudang Utama", qty: 8, unit: "Sak", status: "Hampir Habis" },
  { id: "PRD-003", product: "Kayu Jati Merah", sku: "KY-JT-MRH", warehouse: "Gudang Cabang", qty: 0, unit: "M3", status: "Habis" },
  { id: "PRD-004", product: "Pipa PVC 3/4 inch", sku: "PP-PVC-34", warehouse: "Gudang Utama", qty: 450, unit: "Btg", status: "Tersedia" },
]

export default function StockAvailablePage() {
  const [search, setSearch] = useState("")

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Tersedia": return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 font-medium px-2.5 py-0.5">Tersedia</Badge>
      case "Hampir Habis": return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-0 font-medium px-2.5 py-0.5">Hampir Habis</Badge>
      case "Habis": return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-0 font-medium px-2.5 py-0.5">Habis</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Package className="h-6 w-6 text-indigo-600" />
            </div>
            Daftar Stok
          </h1>
          <p className="text-muted-foreground mt-1">Pantau stok produk secara real-time di seluruh gudang Anda.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="bg-card gap-2 shadow-sm text-foreground border-border w-full sm:w-auto">
            <Download className="h-4 w-4" /> Export Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border shadow-sm border-0 ring-1 ring-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Layers className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total SKU Aktif</p>
              <h3 className="text-2xl font-bold text-foreground">142</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm border-0 ring-1 ring-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stok Menipis</p>
              <h3 className="text-2xl font-bold text-foreground">18</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm border-0 ring-1 ring-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Package className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Kuantitas</p>
              <h3 className="text-2xl font-bold text-foreground">15,892</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20">
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="h-9 flex items-center px-3 font-semibold text-foreground border-r border-border gap-2">
              <Package className="h-4 w-4" /> Stok Tersedia
            </div>
            <div className="h-9 px-3 flex items-center border border-border rounded-md bg-card text-sm font-medium text-foreground cursor-pointer ml-2 shadow-sm">
              Semua Gudang <ChevronDown className="h-3 w-3 ml-2 text-muted-foreground" />
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari produk atau SKU..." 
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
                  <TableHead className="font-semibold text-foreground pl-6">Produk</TableHead>
                  <TableHead className="font-semibold text-foreground">SKU</TableHead>
                  <TableHead className="font-semibold text-foreground">Gudang</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Stok Saat Ini</TableHead>
                  <TableHead className="font-semibold text-foreground text-center pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockStock.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30 border-border transition-colors">
                    <TableCell className="font-medium text-foreground pl-6">{item.product}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="text-muted-foreground">{item.warehouse}</TableCell>
                    <TableCell className="text-foreground font-semibold text-right">
                      {item.qty} <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                    </TableCell>
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
