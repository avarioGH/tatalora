"use client"
import { useState, useEffect } from 'react'
import { PurchasingAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search, Filter, ChevronLeft, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function PurchaseRequestsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await PurchasingAPI.getRequests()
      setData(res?.data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'SUBMITTED': return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">Diajukan</Badge>
      case 'APPROVED': return <Badge className="bg-emerald-600 text-white">Disetujui</Badge>
      case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>
      case 'CONVERTED': return <Badge variant="outline" className="text-primary border-indigo-200">Dikonversi ke RFQ</Badge>
      default: return <Badge variant="outline">{status === 'DRAFT' || !status ? 'Draf' : status}</Badge>
    }
  }

  const filtered = (Array.isArray(data) ? data : []).filter(item =>
    item.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (selectedDoc) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSelectedDoc(null)}><ChevronLeft className="h-4 w-4" /></Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-[28px] font-bold tracking-tight text-foreground">{selectedDoc.request_number}</h1>
                {getStatusBadge(selectedDoc.status)}
              </div>
              <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Permintaan Pembelian (PR)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedDoc.status === 'APPROVED' && (
              <Link href="/purchasing/rfqs/create">
                <Button className="">
                  <ArrowRight className="w-4 h-4 mr-2" /> Buat Permintaan Penawaran (RFQ)
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-[16px] font-semibold">Daftar Barang Diminta</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-[600px] md:min-w-full w-full text-sm">
                  <thead className="bg-muted/30"><tr>
                    <th className="p-4 text-left font-medium text-muted-foreground">Produk</th>
                    <th className="p-4 text-center font-medium text-muted-foreground">Kuantitas</th>
                    <th className="p-4 text-left font-medium text-muted-foreground">Satuan</th>
                    <th className="p-4 text-left font-medium text-muted-foreground">Catatan</th>
                    <th className="p-4 text-right font-medium text-muted-foreground">Tindakan</th>
                  </tr></thead>
                  <tbody>
                    {(selectedDoc.items || []).length === 0 ? (
                      <tr><td colSpan={5} className="p-4 md:p-8 text-center text-muted-foreground">Belum ada barang pada permintaan ini.</td></tr>
                    ) : selectedDoc.items.map((item: any, i: number) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/60 transition-colors">
                        <td className="p-4 font-medium">{item.product?.name || item.product_id}</td>
                        <td className="p-4 text-center font-bold">{item.qty}</td>
                        <td className="p-4 text-muted-foreground">{item.unit || '-'}</td>
                        <td className="p-4 text-muted-foreground">{item.notes || '-'}</td>
                        <td className="p-4 text-right">
                          <Link href={`/purchasing/comparison?product_id=${item.product_id}&pr_id=${selectedDoc.id}&qty=${item.qty}`}>
                            <Button variant="outline" size="sm" className="text-xs">Bandingkan Pemasok</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm h-fit">
            <CardHeader className="border-b bg-muted/10 pb-4"><CardTitle className="text-[16px] font-semibold">Rincian Permintaan</CardTitle></CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div><p className="text-sm font-medium text-muted-foreground mb-1">Nomor Permintaan</p><p className="font-medium">{selectedDoc.request_number}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground mb-1">Sumber</p><p className="font-medium">{selectedDoc.source || 'MANUAL'}</p></div>
              <div><p className="text-sm font-medium text-muted-foreground mb-1">Tanggal Dibutuhkan</p><p className="font-medium">{selectedDoc.required_date ? new Date(selectedDoc.required_date).toLocaleDateString('id-ID') : '-'}</p></div>
              {selectedDoc.reason && (
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Alasan / Keperluan</p><p className="font-medium text-sm">{selectedDoc.reason}</p></div>
              )}
              <div><p className="text-sm font-medium text-muted-foreground mb-1">Tanggal Dibuat</p><p className="font-medium">{new Date(selectedDoc.created_at || Date.now()).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Permintaan Pembelian (PR)</h1>
          <p className="text-muted-foreground mt-1">Ajukan dan kelola permintaan pengadaan barang internal sebelum diteruskan ke pemasok.</p>
        </div>
        <Button onClick={() => window.location.href = "/purchasing/requests/create"} className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> Buat Permintaan</Button>
      </div>
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-[16px] font-semibold">Daftar Permintaan Pembelian</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Cari no. PR atau alasan..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex p-12 justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div> : (
            <div className="overflow-x-auto">
              <table className="min-w-[600px] md:min-w-full w-full text-sm">
                <thead className="bg-muted border-y border-border"><tr>
                  <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">No. Permintaan</th>
                  <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Sumber</th>
                  <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Tanggal Dibutuhkan</th>
                  <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Alasan / Keperluan</th>
                  <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
                  <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Tindakan</th>
                </tr></thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-12 text-muted-foreground">Belum ada permintaan pembelian yang tercatat.</td></tr>
                  ) : filtered.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => setSelectedDoc(item)}>
                      <td className="py-3.5 px-6 font-semibold text-primary text-[13px] dark:text-primary">{item.request_number}</td>
                      <td className="p-4 px-6 text-muted-foreground">{item.source || 'MANUAL'}</td>
                      <td className="p-4 px-6 text-muted-foreground">{item.required_date ? new Date(item.required_date).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="p-4 px-6 text-muted-foreground max-w-[200px] truncate">{item.reason || '-'}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]">{getStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]"><Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Lihat Detail</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
