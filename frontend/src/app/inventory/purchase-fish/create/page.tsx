"use client"
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import api from '@/lib/api'
import { Plus, Trash2, Save, Users, Building, Calendar, ShoppingCart, Printer } from 'lucide-react'
import { toast } from 'sonner'

export default function PurchaseFishForm() {
  const [partners, setPartners] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialPartnerId = searchParams?.get('partner_id') || "";

  const [formData, setFormData] = useState({
    partner_id: initialPartnerId,
    warehouse_id: "",
    date: new Date().toISOString().slice(0, 10),
    paid_amount: 0,
    payment_method: "TUNAI",
    payment_terms: 0
  })

  const [items, setItems] = useState<any[]>([{ product_id: "", qty: 1, unit_price: 0 }])
  const [processing, setProcessing] = useState(false)
  const [showNota, setShowNota] = useState(false)
  const [notaData, setNotaData] = useState<any>(null)
  const [isWarehouseLocked, setIsWarehouseLocked] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, wRes, prRes] = await Promise.all([
          api.get('/customers'), // using customers endpoint for partners
          api.get('/inventory/warehouses'),
          api.get('/inventory/products')
        ])
        setPartners(pRes.data?.data || pRes.data || [])
        setWarehouses(wRes.data || [])
        setProducts(prRes.data || [])

        const stored = localStorage.getItem('active_warehouse');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.id && parsed.id !== 'all') {
              setFormData(prev => ({ ...prev, warehouse_id: parsed.id }));
              setIsWarehouseLocked(true);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [])

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const addItem = () => setItems([...items, { product_id: "", qty: 1, unit_price: 0 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.qty || 0) * parseFloat(item.unit_price || 0)), 0)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!formData.partner_id || !formData.warehouse_id) return toast.error("Pilih Nelayan & Gudang!")
    if (items.some(i => !i.product_id || i.qty <= 0)) return toast.error("Lengkapi data ikan!")

    setProcessing(true)
    try {
      const payloadItems = items.map(i => ({
        ...i,
        qty: parseFloat(i.qty),
        unit_price: parseFloat(i.unit_price)
      }))

      const res = await api.post('/inventory/fish-purchase/atomic', {
        ...formData,
        items: payloadItems
      })
      toast.success("Pembelian ikan berhasil! Stok & tagihan langsung terupdate otomatis.")
      
      const partner = partners.find(p => (p.id || p._id) === formData.partner_id)
      const populatedItems = payloadItems.map(i => {
         const product = products.find(pr => (pr.id || pr._id) === i.product_id)
         return { ...i, product_name: product?.name || 'Ikan' }
      })

      setNotaData({
        order_number: res.data?.order_number || `FP-${Date.now()}`,
        date: formData.date,
        partner_name: partner?.name || 'Nelayan',
        items: populatedItems,
        totalAmount,
        paid_amount: formData.paid_amount
      })
      setShowNota(true)

      // Reset form
      setFormData({ ...formData, paid_amount: 0 })
      setItems([{ product_id: "", qty: 1, unit_price: 0 }])
    } catch (err: any) {
      toast.error("Gagal: " + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message))
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = () => {
    const printContent = document.getElementById('nota-print-area')
    if (printContent) {
      const originalContents = document.body.innerHTML
      document.body.innerHTML = printContent.innerHTML
      window.print()
      document.body.innerHTML = originalContents
      window.location.reload() // reload to restore react event listeners
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pembelian Ikan (Nelayan)</h1>
          <p className="text-muted-foreground">Catat pembelian ikan langsung dari nelayan (Stok & Utang otomatis masuk).</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Users className="w-4 h-4"/> Nelayan / Mitra</Label>
              <Select value={formData.partner_id} onValueChange={(val) => setFormData({...formData, partner_id: val || ""})}>
                        <SelectTrigger className="w-full">
                          <span className="flex flex-1 text-left">
                            {formData.partner_id 
                              ? (partners.find(p => (p.id || p._id) === formData.partner_id)?.name || formData.partner_id)
                              : <span className="text-muted-foreground">-- Pilih Nelayan --</span>}
                          </span>
                        </SelectTrigger>
                        <SelectContent searchable>
                          {partners.map(p => (
                            <SelectItem key={p.id || p._id} value={p.id || p._id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building className="w-4 h-4"/> Gudang Penerimaan</Label>
              <Select value={formData.warehouse_id} onValueChange={(val) => setFormData({...formData, warehouse_id: val || ""})} disabled={isWarehouseLocked}>
                        <SelectTrigger className="w-full">
                          <span className="flex flex-1 text-left">
                            {formData.warehouse_id 
                              ? (warehouses.find(w => (w.id || w._id) === formData.warehouse_id)?.name || formData.warehouse_id)
                              : <span className="text-muted-foreground">-- Pilih Gudang --</span>}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map(w => (
                            <SelectItem key={w.id || w._id} value={w.id || w._id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Tanggal Pembelian</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Daftar Ikan yang Dibeli</CardTitle>
            <Button type="button" onClick={addItem} variant="outline" size="sm" className="flex items-center gap-2"><Plus className="w-4 h-4"/> Tambah Baris</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Ikan (Produk)</TableHead>
                  <TableHead>Berat / Qty (Kg)</TableHead>
                  <TableHead>Harga Per Kg (Rp)</TableHead>
                  <TableHead>Subtotal (Rp)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select value={item.product_id} onValueChange={(val) => handleItemChange(index, 'product_id', val)}>
                          <SelectTrigger className="w-full">
                            <span className="flex flex-1 text-left">
                              {item.product_id 
                                ? (products.find(pr => (pr.id || pr._id) === item.product_id)?.name || item.product_id)
                                : <span className="text-muted-foreground">-- Pilih Ikan --</span>}
                            </span>
                          </SelectTrigger>
                          <SelectContent searchable>
                            {products.map(pr => (
                              <SelectItem key={pr.id || pr._id} value={pr.id || pr._id}>{pr.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0.1" step="0.1" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} required />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0" value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', e.target.value)} required />
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      Rp {(parseFloat(item.qty || 0) * parseFloat(item.unit_price || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Tagihan:</p>
                <p className="text-2xl font-bold text-emerald-600">Rp {totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-blue-200 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-900/10">
          <CardHeader>
            <CardTitle className="text-lg text-blue-700 dark:text-blue-400">Pembayaran & Termin (Utang)</CardTitle>
            <CardDescription>Jika belum dibayar lunas, sisa tagihan akan masuk ke utang. Atur termin jatuh tempo di bawah.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nominal Dibayar (Rp)</Label>
              <Input type="number" min="0" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: parseFloat(e.target.value) || 0})} />
              {formData.paid_amount > 0 && formData.paid_amount < totalAmount && (
                <p className="text-xs text-amber-600 font-medium">Sisa utang Rp {(totalAmount - formData.paid_amount).toLocaleString()} akan masuk ke Saldo Mitra.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <select 
                className="w-full border p-2 rounded-md bg-card dark:bg-background" 
                value={formData.payment_method} 
                onChange={e => setFormData({...formData, payment_method: e.target.value})}
              >
                <option value="TUNAI">Tunai / Cash</option>
                <option value="TRANSFER">Transfer Bank</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Termin / Jatuh Tempo (Hari)</Label>
              <Select 
                value={formData.payment_terms.toString()} 
                onValueChange={val => setFormData({...formData, payment_terms: parseInt(val || '0')})}
              >
                <SelectTrigger className="bg-card dark:bg-background">
                  <SelectValue placeholder="Pilih Termin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Cash / 0 Hari</SelectItem>
                  <SelectItem value="7">7 Hari (Net 7)</SelectItem>
                  <SelectItem value="14">14 Hari (Net 14)</SelectItem>
                  <SelectItem value="30">30 Hari (Net 30)</SelectItem>
                  <SelectItem value="60">60 Hari (Net 60)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">Batal</Button>
          <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            {processing ? 'Menyimpan...' : 'Simpan Pembelian & Update Stok'}
          </Button>
        </div>
      </form>

      <Dialog open={showNota} onOpenChange={setShowNota}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nota Pembelian Nelayan</DialogTitle>
          </DialogHeader>
          {notaData && (
            <div id="nota-print-area" className="p-4 bg-card text-black rounded border">
              <div className="text-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold">NOTA PEMBELIAN</h2>
                <p className="text-sm">No: {notaData.order_number}</p>
                <p className="text-sm">Tgl: {new Date(notaData.date).toLocaleDateString('id-ID')}</p>
              </div>
              <div className="mb-4">
                <p className="font-semibold">Nelayan: {notaData.partner_name}</p>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Item</th>
                    <th className="text-right py-1">Qty</th>
                    <th className="text-right py-1">Harga</th>
                    <th className="text-right py-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {notaData.items.map((i: any, idx: number) => (
                    <tr key={idx} className="border-b border-dashed">
                      <td className="py-1">{i.product_name}</td>
                      <td className="text-right py-1">{i.qty}</td>
                      <td className="text-right py-1">{i.unit_price.toLocaleString()}</td>
                      <td className="text-right py-1">{(i.qty * i.unit_price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-sm font-semibold">
                <div className="flex justify-between">
                  <span>TOTAL:</span>
                  <span>Rp {notaData.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>DIBAYAR:</span>
                  <span>Rp {notaData.paid_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600 border-t pt-1">
                  <span>SISA TAGIHAN / UTANG:</span>
                  <span>Rp {Math.max(0, notaData.totalAmount - notaData.paid_amount).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-8 text-center text-xs">
                <p>Terima kasih atas kerjasamanya.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNota(false)}>Tutup</Button>
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" /> Cetak Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

