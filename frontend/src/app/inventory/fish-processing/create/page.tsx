"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import api from '@/lib/api'
import { Plus, Trash2, Save, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function FishProcessingForm() {
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    notes: ""
  })

  const [inputs, setInputs] = useState<any[]>([{ warehouse_id: "", product_id: "", qty: 1 }])
  const [outputs, setOutputs] = useState<any[]>([{ warehouse_id: "", product_id: "", qty: 1 }])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wRes, pRes] = await Promise.all([
          api.get('/inventory/warehouses'),
          api.get('/inventory/products')
        ])
        setWarehouses(wRes.data || [])
        setProducts(pRes.data || [])
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [])

  const handleInputChange = (index: number, field: string, value: any) => {
    const newArr = [...inputs]; newArr[index][field] = value; setInputs(newArr)
  }
  const handleOutputChange = (index: number, field: string, value: any) => {
    const newArr = [...outputs]; newArr[index][field] = value; setOutputs(newArr)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (inputs.some(i => !i.warehouse_id || !i.product_id || i.qty <= 0)) return toast.error("Lengkapi data bahan baku (Input)!")
    if (outputs.some(o => !o.warehouse_id || !o.product_id || o.qty <= 0)) return toast.error("Lengkapi data hasil produksi (Output)!")

    setProcessing(true)
    try {
      await api.post('/inventory/fish-processing', {
        ...formData,
        inputs,
        outputs
      })
      toast.success("Pengolahan stok (Repacking) berhasil disimpan!")
      setInputs([{ warehouse_id: "", product_id: "", qty: 1 }])
      setOutputs([{ warehouse_id: "", product_id: "", qty: 1 }])
      setFormData({...formData, notes: ""})
    } catch (err: any) {
      toast.error("Gagal: " + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengolahan Stok (Repacking / Fillet)</h1>
        <p className="text-muted-foreground">Catat proses perubahan stok (misal: 50kg Ikan Whole menjadi 20kg Ikan Fillet).</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informasi Proses</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tanggal Produksi / Proses</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Input type="text" placeholder="Misal: Repacking karena permintaan fillet" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </CardContent>
        </Card>

        {/* INPUT SECTION */}
        <Card className="border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg text-rose-700 dark:text-rose-400">Bahan Baku (Stok Berkurang)</CardTitle>
              <CardDescription>Pilih ikan utuh/mentah yang akan diproses.</CardDescription>
            </div>
            <Button type="button" onClick={() => setInputs([...inputs, { warehouse_id: "", product_id: "", qty: 1 }])} variant="outline" size="sm"><Plus className="w-4 h-4 mr-2"/> Tambah</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dari Gudang</TableHead>
                  <TableHead>Produk / Ikan Asal</TableHead>
                  <TableHead>Berat (Kg)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inputs.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <select className="w-full border p-2 rounded-md bg-card dark:bg-background" value={item.warehouse_id} onChange={e => handleInputChange(index, 'warehouse_id', e.target.value)} required>
                        <option value="">-- Pilih Gudang --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select className="w-full border p-2 rounded-md bg-card dark:bg-background" value={item.product_id} onChange={e => handleInputChange(index, 'product_id', e.target.value)} required>
                        <option value="">-- Pilih Produk --</option>
                        {products.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0.1" step="0.1" value={item.qty} onChange={e => handleInputChange(index, 'qty', parseFloat(e.target.value))} required />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setInputs(inputs.filter((_, i) => i !== index))} disabled={inputs.length === 1}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* OUTPUT SECTION */}
        <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg text-emerald-700 dark:text-emerald-400">Hasil Produksi (Stok Bertambah)</CardTitle>
              <CardDescription>Pilih hasil potongan / fillet akhir (Yield).</CardDescription>
            </div>
            <Button type="button" onClick={() => setOutputs([...outputs, { warehouse_id: "", product_id: "", qty: 1 }])} variant="outline" size="sm"><Plus className="w-4 h-4 mr-2"/> Tambah</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Simpan ke Gudang</TableHead>
                  <TableHead>Produk / Ikan Hasil</TableHead>
                  <TableHead>Berat Akhir (Kg)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outputs.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <select className="w-full border p-2 rounded-md bg-card dark:bg-background" value={item.warehouse_id} onChange={e => handleOutputChange(index, 'warehouse_id', e.target.value)} required>
                        <option value="">-- Pilih Gudang --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select className="w-full border p-2 rounded-md bg-card dark:bg-background" value={item.product_id} onChange={e => handleOutputChange(index, 'product_id', e.target.value)} required>
                        <option value="">-- Pilih Produk Hasil --</option>
                        {products.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" min="0.1" step="0.1" value={item.qty} onChange={e => handleOutputChange(index, 'qty', parseFloat(e.target.value))} required />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setOutputs(outputs.filter((_, i) => i !== index))} disabled={outputs.length === 1}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            {processing ? 'Memproses...' : 'Proses Repacking & Sesuaikan Stok'}
          </Button>
        </div>
      </form>
    </div>
  )
}

