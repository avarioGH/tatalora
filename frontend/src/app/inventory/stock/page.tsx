"use client"

import React, { useState, useEffect } from "react"
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
  Search, Filter, Package, ChevronDown, Download, Layers, AlertCircle, Loader2
} from "lucide-react"
import { InventoryAPI } from "@/lib/api"

export default function StockAvailablePage() {
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState("all")

  useEffect(() => {
    fetchRealStockData()
  }, [])

  const fetchRealStockData = async () => {
    setLoading(true)
    try {
      const [prodRes, whRes] = await Promise.all([
        InventoryAPI.getProducts().catch(() => []),
        InventoryAPI.getWarehouses().catch(() => [])
      ])

      const pList = Array.isArray(prodRes) ? prodRes : (prodRes?.data || [])
      const wList = Array.isArray(whRes) ? whRes : (whRes?.data || [])

      setProducts(pList)
      setWarehouses(wList)
    } catch (err) {
      console.error("Error loading real stock data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Flatten products with warehouse stock rows
  const stockRows: any[] = []
  products.forEach(p => {
    const totalQty = p.warehouse_stocks?.reduce((s: number, ws: any) => s + (Number(ws.quantity) || 0), 0) || Number(p.stock) || 0
    const minQty = Number(p.min_stock) || 10
    
    let defaultStatus = "Tersedia"
    if (totalQty === 0) defaultStatus = "Habis"
    else if (totalQty <= minQty) defaultStatus = "Hampir Habis"

    if (p.warehouse_stocks && p.warehouse_stocks.length > 0) {
      p.warehouse_stocks.forEach((ws: any) => {
        const whName = ws.warehouse?.name || 'Gudang Utama'
        const q = Number(ws.quantity) || 0
        let st = "Tersedia"
        if (q === 0) st = "Habis"
        else if (q <= minQty) st = "Hampir Habis"

        stockRows.push({
          id: `${p.id}-${ws.warehouse_id}`,
          productId: p.id,
          product: p.name,
          sku: p.code || p.sku || '-',
          warehouse: whName,
          warehouseId: ws.warehouse_id,
          qty: q,
          unit: p.unit || 'Pcs',
          status: st
        })
      })
    } else {
      stockRows.push({
        id: p.id,
        productId: p.id,
        product: p.name,
        sku: p.code || p.sku || '-',
        warehouse: 'Gudang Utama',
        warehouseId: 'default',
        qty: totalQty,
        unit: p.unit || 'Pcs',
        status: defaultStatus
      })
    }
  })

  // Metrics
  const totalSKUs = products.length
  const lowStockCount = stockRows.filter(r => r.status === 'Hampir Habis' || r.status === 'Habis').length
  const totalStockQty = stockRows.reduce((sum, r) => sum + r.qty, 0)

  // Filter
  const filteredRows = stockRows.filter(r => {
    const matchesSearch = 
      r.product.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase()) ||
      r.warehouse.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false
    if (selectedWarehouse !== "all" && r.warehouseId !== selectedWarehouse) return false
    return true
  })

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
              <h3 className="text-2xl font-bold text-foreground">{totalSKUs}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm border-0 ring-1 ring-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stok Menipis / Habis</p>
              <h3 className="text-2xl font-bold text-foreground">{lowStockCount}</h3>
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
              <h3 className="text-2xl font-bold text-foreground">{totalStockQty.toLocaleString()}</h3>
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
            
            <div className="relative">
              <select 
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
                className="h-9 bg-background border border-border rounded-md px-3 text-sm text-foreground focus:outline-none"
              >
                <option value="all">Semua Gudang</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari produk atau SKU..." 
                className="pl-9 bg-background border-border h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat daftar stok produk dari database...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent bg-muted/10">
                    <TableHead className="font-semibold text-foreground pl-6">Produk</TableHead>
                    <TableHead className="font-semibold text-foreground">SKU / Kode</TableHead>
                    <TableHead className="font-semibold text-foreground">Gudang</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Stok Saat Ini</TableHead>
                    <TableHead className="font-semibold text-foreground text-center pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                        <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-base font-medium">Tidak ada data stok ditemukan di database.</p>
                        <p className="text-xs text-muted-foreground mt-1">Tambahkan produk baru pada menu Produk untuk melihat stok di sini.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 border-border transition-colors">
                        <TableCell className="font-medium text-foreground pl-6">{item.product}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="text-muted-foreground">{item.warehouse}</TableCell>
                        <TableCell className="text-foreground font-semibold text-right">
                          {item.qty.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-center pr-6">
                          {getStatusBadge(item.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
