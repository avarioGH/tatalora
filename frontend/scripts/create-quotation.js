const fs = require('fs');
const path = require('path');

const code = `"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { 
  Plus, Trash2, ArrowLeft, Send, MapPin, Edit2, ChevronDown, ChevronUp, FileText, Paperclip
} from 'lucide-react'
import { B2BApi, api } from '@/lib/api'

export default function CreateQuotationPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [showSalesPerson, setShowSalesPerson] = useState(true)
  const [showShippingInfo, setShowShippingInfo] = useState(true)

  const [formData, setFormData] = useState({
    customerId: '',
    quotationNumber: 'QU/' + Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
    quotationDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    paymentTerms: 'Net 30',
    reference: '',
    tags: '',
    salesPerson: '',
    deliveryDate: '',
    expedition: '',
    notes: '',
  })

  const [items, setItems] = useState<any[]>([
    { id: 1, productId: '', description: '', qty: 1, unit: '', discount: '0%', price: 0, tax: '', total: 0 }
  ])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const custRes = await api.get('/crm/customers')
      setCustomers(custRes.data.data || custRes.data || [])
      
      const prodRes = await api.get('/inventory/products?limit=100')
      setProducts(prodRes.data.data || prodRes.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index][field] = value
    
    // Auto populate price & unit when product is selected
    if (field === 'productId') {
      const prod = products.find(p => p.id === value)
      if (prod) {
        newItems[index].price = prod.selling_price || 0
        newItems[index].unit = prod.unit || 'Pcs'
        newItems[index].description = prod.name || ''
      }
    }

    // Calculate line total
    const qty = parseFloat(newItems[index].qty) || 0
    const price = parseFloat(newItems[index].price) || 0
    let discountVal = 0
    const d = newItems[index].discount.toString()
    if (d.includes('%')) {
      discountVal = (parseFloat(d) / 100) * (qty * price)
    } else {
      discountVal = parseFloat(d) || 0
    }
    
    newItems[index].total = (qty * price) - discountVal
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { id: Date.now(), productId: '', description: '', qty: 1, unit: '', discount: '0%', price: 0, tax: '', total: 0 }])
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const subTotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)

  const handleSubmit = async () => {
    if (!formData.customerId) {
      alert("Pilih pelanggan terlebih dahulu!")
      return
    }
    setLoading(true)
    try {
      const payload = {
        customerId: formData.customerId,
        quotationDate: formData.quotationDate,
        expirationDate: formData.expirationDate || formData.quotationDate,
        paymentTerms: formData.paymentTerms,
        notes: formData.notes,
        items: items.filter(i => i.productId).map(i => ({
          productId: i.productId,
          qty: parseFloat(i.qty),
          price: parseFloat(i.price),
          discount: parseFloat(i.discount) || 0,
          taxRate: 0 // Simplification for UI
        }))
      }
      await B2BApi.createQuotation(payload)
      alert('Penawaran berhasil dibuat!')
      router.push('/sales')
    } catch (err: any) {
      alert('Gagal membuat penawaran: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 pb-24">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
        <h1 className="text-2xl font-bold text-foreground">Buat Penawaran Penjualan</h1>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-6 space-y-8">
          
          {/* Top Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center">Pelanggan <span className="text-red-500 ml-1">*</span></label>
                <Select value={formData.customerId} onValueChange={v => setFormData({...formData, customerId: v})}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih Pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.customerId && (
                  <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                    <MapPin className="w-3 h-3 text-indigo-500" />
                    <span>Jl. Ahmad Yani, Pontianak</span>
                    <button className="text-indigo-500 hover:text-indigo-600 ml-1"><Edit2 className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center">Tgl. Transaksi <span className="text-red-500 ml-1">*</span></label>
                <Input type="date" value={formData.quotationDate} onChange={e => setFormData({...formData, quotationDate: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Referensi</label>
                <Input placeholder="Referensi" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="bg-background" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Nomor</label>
                <Input value={formData.quotationNumber} onChange={e => setFormData({...formData, quotationNumber: e.target.value})} className="bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Kadaluarsa</label>
                  <Input type="date" value={formData.expirationDate} onChange={e => setFormData({...formData, expirationDate: e.target.value})} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Termin</label>
                  <Select value={formData.paymentTerms} onValueChange={v => setFormData({...formData, paymentTerms: v})}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Termin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="COD">C.O.D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Tag</label>
                <Select value={formData.tags} onValueChange={v => setFormData({...formData, tags: v})}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Pilih Tag" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Baru">Pelanggan Baru</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Expandables */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <button 
                className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700" 
                onClick={() => setShowSalesPerson(!showSalesPerson)}
              >
                {showSalesPerson ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showSalesPerson ? "Sembunyikan Sales Person" : "Tampilkan Sales Person"}
              </button>
              {showSalesPerson && (
                <div className="mt-4 md:w-1/2 pr-4 space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Sales Person</label>
                  <Select value={formData.salesPerson} onValueChange={v => setFormData({...formData, salesPerson: v})}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Pilih Sales Person" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sean">Sean Billion</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <button 
                className="flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 mt-2" 
                onClick={() => setShowShippingInfo(!showShippingInfo)}
              >
                {showShippingInfo ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                {showShippingInfo ? "Sembunyikan Informasi Pengiriman" : "Tampilkan Informasi Pengiriman"}
              </button>
              {showShippingInfo && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Tanggal Pengiriman</label>
                    <Input type="date" value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Ekspedisi</label>
                    <Select value={formData.expedition} onValueChange={v => setFormData({...formData, expedition: v})}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder="Pilih ekspedisi" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JNE">JNE</SelectItem>
                        <SelectItem value="JNT">J&T</SelectItem>
                        <SelectItem value="Kurir Internal">Kurir Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Utilities */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 pt-4">
            <Input placeholder="Scan Barcode/SKU" className="w-full md:w-64 bg-background" />
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="auto-row" />
                <label htmlFor="auto-row" className="text-sm font-medium text-muted-foreground cursor-pointer">Tambah baris otomatis</label>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="tax-included" className="text-sm font-medium text-muted-foreground cursor-pointer">Harga termasuk pajak</label>
                <Switch id="tax-included" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px]">Produk</TableHead>
                  <TableHead className="w-[200px]">Deskripsi</TableHead>
                  <TableHead className="w-[100px]">Kuantitas</TableHead>
                  <TableHead className="w-[120px]">Satuan</TableHead>
                  <TableHead className="w-[100px]">Discount</TableHead>
                  <TableHead className="w-[150px]">Harga</TableHead>
                  <TableHead className="w-[120px]">Pajak</TableHead>
                  <TableHead className="w-[150px] text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="p-2">
                      <Select value={item.productId} onValueChange={v => handleItemChange(index, 'productId', v)}>
                        <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Pilih Produk" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="h-9 bg-background" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input type="number" min="1" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} className="h-9 bg-background text-center" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Select value={item.unit} onValueChange={v => handleItemChange(index, 'unit', v)}>
                        <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="Satuan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pcs">Pcs</SelectItem>
                          <SelectItem value="Box">Box</SelectItem>
                          <SelectItem value="Kg">Kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Input value={item.discount} onChange={e => handleItemChange(index, 'discount', e.target.value)} className="h-9 bg-background" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input type="number" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="h-9 bg-background" />
                    </TableCell>
                    <TableCell className="p-2">
                      <Select value={item.tax} onValueChange={v => handleItemChange(index, 'tax', v)}>
                        <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="-" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PPN11">PPN 11%</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2 text-right font-medium">
                      {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(item.total)}
                    </TableCell>
                    <TableCell className="p-2">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-2 bg-background border-t border-border">
              <Button variant="ghost" onClick={addItem} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"><Plus className="w-4 h-4 mr-2" /> Tambah baris</Button>
            </div>
          </div>

          {/* Bottom Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Left: Accordions */}
            <div className="space-y-3">
              <Card className="border-border shadow-none">
                <button className="w-full flex items-center justify-between p-3 text-sm font-semibold hover:bg-muted/50 rounded-md">
                  <div className="flex items-center"><FileText className="w-4 h-4 mr-2 text-muted-foreground" /> Pesan</div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </Card>
              <Card className="border-border shadow-none">
                <button className="w-full flex items-center justify-between p-3 text-sm font-semibold hover:bg-muted/50 rounded-md">
                  <div className="flex items-center"><Paperclip className="w-4 h-4 mr-2 text-muted-foreground" /> Attachment</div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </Card>
            </div>

            {/* Right: Calculations */}
            <div className="space-y-4 bg-muted/30 p-6 rounded-md border border-border">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Sub Total</span>
                <span>{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(subTotal)}</span>
              </div>
              <div className="flex flex-col gap-2 items-end pt-2">
                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center"><Plus className="w-3 h-3 mr-1" /> Tambahan Diskon</button>
                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center"><Plus className="w-3 h-3 mr-1" /> Biaya pengiriman</button>
                <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center"><Plus className="w-3 h-3 mr-1" /> Biaya Transaksi</button>
              </div>
              <div className="border-t border-border pt-4 mt-2 flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-xl font-bold text-indigo-600">Rp. {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(subTotal)}</span>
              </div>
              <Button onClick={handleSubmit} disabled={loading} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg">
                {loading ? "Memproses..." : "Kirim Penawaran"}
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
`

fs.writeFileSync(path.join(__dirname, '../src/app/sales/quotations/create/page.tsx'), code, 'utf8');

console.log("Written Create Quotation page");
