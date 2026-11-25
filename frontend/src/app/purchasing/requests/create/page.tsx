"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Plus, Trash2, ArrowLeft, Save, ShoppingCart, Loader2, Building2
} from "lucide-react"
import { api, InventoryAPI } from "@/lib/api"

export default function CreatePurchaseRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Master Data
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])

  // Form State
  const [requestNumber, setRequestNumber] = useState(`PR-${Date.now().toString().slice(-6)}`)
  const [requiredDate, setRequiredDate] = useState(new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }))
  const [warehouseId, setWarehouseId] = useState("")
  const [reason, setReason] = useState("")

  // Line items
  const [items, setItems] = useState<any[]>([
    {
      id: `item-${Date.now()}`,
      product_id: "",
      qty: 1,
      unit: "Pcs",
      notes: ""
    }
  ])

  useEffect(() => {
    const fetchMaster = async () => {
      setLoading(true)
      try {
        const [prodRes, whRes] = await Promise.all([
          InventoryAPI.getProducts().catch(() => []),
          api.get('/inventory/warehouses').catch(() => ({ data: [] }))
        ])
        setProducts(Array.isArray(prodRes) ? prodRes : (prodRes?.data || []))
        setWarehouses(Array.isArray(whRes?.data) ? whRes.data : [])
        if (whRes?.data?.length > 0) {
          setWarehouseId(whRes.data[0].id)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchMaster()
  }, [])

  const handleProductChange = (index: number, pId: string) => {
    const prod = products.find(p => p.id === pId)
    const updated = [...items]
    updated[index].product_id = pId
    updated[index].unit = prod?.unit?.name || prod?.unit || "Pcs"
    setItems(updated)
  }

  const handleRowChange = (index: number, field: string, val: any) => {
    const updated = [...items]
    updated[index][field] = val
    setItems(updated)
  }

  const addRow = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        product_id: "",
        qty: 1,
        unit: "Pcs",
        notes: ""
      }
    ])
  }

  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validItems = items.filter(it => it.product_id && it.qty > 0)
    if (validItems.length === 0) {
      alert("Pilih minimal 1 produk valid pada daftar permintaan!")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        request_number: requestNumber,
        required_date: new Date(requiredDate).toISOString(),
        warehouse_id: warehouseId || undefined,
        reason: reason || undefined,
        source: "MANUAL",
        items: validItems.map(it => ({
          product_id: it.product_id,
          qty: Number(it.qty) || 1,
          unit: it.unit || "Pcs",
          notes: it.notes || undefined
        }))
      }

      await api.post('/purchasing/requests', payload)
      router.push('/purchasing/requests')
    } catch (err: any) {
      console.error(err)
      alert("Gagal menyimpan Purchase Request: " + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/purchasing/requests")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pembelian & Pengadaan</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
              Buat Permintaan Pembelian (Purchase Request)
            </h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Informasi Permintaan</CardTitle>
            <CardDescription>Rincian nomor pengajuan, tanggal kebutuhan barang, dan gudang pemohon.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">No. Permintaan (PR Number)</Label>
                <Input 
                  value={requestNumber} 
                  onChange={e => setRequestNumber(e.target.value)} 
                  className="bg-background border-border font-mono font-medium"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Dibutuhkan Pada Tanggal</Label>
                <Input 
                  type="date"
                  value={requiredDate} 
                  onChange={e => setRequiredDate(e.target.value)} 
                  className="bg-background border-border"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Gudang Tujuan</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Pilih Gudang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-sm font-semibold">Alasan Kebutuhan / Catatan</Label>
              <Textarea 
                placeholder="Misal: Stok menipis untuk persiapan pesanan pelanggan batch November..." 
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={2}
                className="bg-background border-border text-sm resize-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Daftar Barang yang Diminta</CardTitle>
                <CardDescription>Pilih produk dan tentukan kuantitas yang perlu diadakan.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                <Plus className="w-4 h-4" /> Tambah Baris
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[45%] font-semibold">Produk</TableHead>
                    <TableHead className="w-[15%] font-semibold text-center">Kuantitas</TableHead>
                    <TableHead className="w-[15%] font-semibold text-center">Satuan (Unit)</TableHead>
                    <TableHead className="w-[20%] font-semibold">Catatan Khusus</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row, idx) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50">
                      <TableCell className="p-3">
                        <Select value={row.product_id} onValueChange={(v) => handleProductChange(idx, v)}>
                          <SelectTrigger className="h-9 bg-background border-border text-xs w-full">
                            <SelectValue placeholder="Pilih Produk..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name} {p.sku ? `(${p.sku})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Input 
                          type="number"
                          min="1"
                          value={row.qty}
                          onChange={e => handleRowChange(idx, "qty", Math.max(1, parseFloat(e.target.value) || 1))}
                          className="h-9 bg-background border-border text-center text-xs font-semibold"
                        />
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Input 
                          value={row.unit}
                          onChange={e => handleRowChange(idx, "unit", e.target.value)}
                          className="h-9 bg-background border-border text-center text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-3">
                        <Input 
                          placeholder="Spesifikasi/merek..."
                          value={row.notes}
                          onChange={e => handleRowChange(idx, "notes", e.target.value)}
                          className="h-9 bg-background border-border text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeRow(idx)}
                          disabled={items.length === 1}
                          className="h-8 w-8 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => router.push("/purchasing/requests")} disabled={submitting}>
            Batalkan
          </Button>
          <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Ajukan Permintaan Pembelian
          </Button>
        </div>
      </form>
    </div>
  )
}
