const fs = require('fs');
const path = require('path');

const code = `"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Card, CardContent 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { 
  ArrowLeft, Share2, Printer, CheckCircle2, XCircle, MoreVertical, Edit2, MapPin
} from 'lucide-react'
import { B2BApi } from '@/lib/api'

export default function QuotationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchDetails()
  }, [id])

  const fetchDetails = async () => {
    try {
      const res = await B2BApi.getQuotation(id)
      setData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!data) return
    try {
      await B2BApi.confirmQuotation(data.id)
      alert("Penawaran diterima dan Pemesanan (Sales Order) otomatis dibuat!")
      router.push('/sales')
    } catch (e: any) {
      alert("Gagal: " + e.message)
    }
  }

  const handleReject = async () => {
    if (!data) return
    try {
      await B2BApi.cancelQuotation(data.id)
      alert("Penawaran telah ditolak.")
      fetchDetails()
    } catch (e: any) {
      alert("Gagal: " + e.message)
    }
  }

  if (loading) return <div className="p-10 text-center">Memuat detail...</div>
  if (!data) return <div className="p-10 text-center">Data tidak ditemukan.</div>

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 pb-24">
      <div className="flex items-center space-x-4 mb-2">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Kembali</Button>
        <h1 className="text-2xl font-bold text-foreground">Detil Penawaran {data.quotation_number}</h1>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-border bg-muted/10">
            <div>
              <span className={\`font-semibold \${data.status === 'DRAFT' || data.status === 'SENT' ? 'text-amber-500' : data.status === 'CONFIRMED' ? 'text-emerald-500' : 'text-rose-500'}\`}>
                {data.status === 'DRAFT' ? 'Draft' : data.status === 'SENT' ? 'Terkirim' : data.status === 'CONFIRMED' ? 'Diterima' : 'Ditolak'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <Button variant="outline" className="bg-background gap-2"><Share2 className="w-4 h-4" /> Bagikan</Button>
              <Button variant="outline" className="bg-background gap-2"><Printer className="w-4 h-4" /> Print</Button>
              
              {data.status !== 'CONFIRMED' && data.status !== 'CANCELLED' && (
                <>
                  <Button onClick={handleConfirm} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Tandai sbg diterima
                  </Button>
                  <Button onClick={handleReject} className="bg-rose-500 hover:bg-rose-600 text-white gap-2">
                    <XCircle className="w-4 h-4" /> Tandai sbg ditolak
                  </Button>
                </>
              )}
              
              <Button variant="outline" size="icon" className="bg-background"><MoreVertical className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Info Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pelanggan</p>
                <p className="font-semibold text-indigo-600">{data.customer?.name || '-'}</p>
                <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{data.customer?.address || 'pontianak'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tgl. Transaksi</p>
                  <p className="font-semibold">{new Date(data.quotation_date).toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Kadaluarsa</p>
                  <p className="font-semibold">{data.expiration_date ? new Date(data.expiration_date).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sales Person</p>
                <p className="font-semibold">sean billion</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nomor</p>
                <p className="font-semibold">{data.quotation_number}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-6 pb-6">
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Kuantitas</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead>Pajak</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-indigo-600">{item.product?.sku || '-'} - {item.product?.name || '-'}</TableCell>
                      <TableCell>{item.product?.name || '-'}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell>{item.product?.unit || 'Pcs'}</TableCell>
                      <TableCell className="text-right">{item.discount || '0'}%</TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat('id-ID').format(item.unit_price)}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat('id-ID').format(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Total Kuantitas Row */}
                  <TableRow className="bg-muted/10 font-semibold">
                    <TableCell colSpan={2} className="text-right">Total Kuantitas</TableCell>
                    <TableCell className="text-right">{data.items?.reduce((sum: number, i: any) => sum + i.qty, 0)}</TableCell>
                    <TableCell colSpan={5}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            {/* Calculation summary */}
            <div className="mt-8 flex justify-end">
              <div className="w-64 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold">Sub Total</span>
                  <span>{new Intl.NumberFormat('id-ID', { minimumFractionDigits: 3 }).format(data.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg">{new Intl.NumberFormat('id-ID', { minimumFractionDigits: 3 }).format(data.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Card */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-6">
          <p className="font-semibold text-sm mb-4">Pantau log perubahan data</p>
          <div className="flex items-center text-sm text-indigo-600">
            <Edit2 className="w-4 h-4 mr-2" />
            Terakhir diubah oleh sean billion pada {new Date(data.updated_at).toLocaleDateString('id-ID')}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
`

const dir = path.join(__dirname, '../src/app/sales/quotations/[id]');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'page.tsx'), code, 'utf8');

console.log("Written Quotation Detail page");
