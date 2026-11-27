"use client"
import { useEffect, useState } from 'react'
import { B2BApi } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search, Filter, FileText } from 'lucide-react'
import Link from 'next/link'

export default function QuotationsPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchQuotations()
  }, [])

  const fetchQuotations = async () => {
    try {
      const res = await B2BApi.getQuotations({ page: 1, limit: 100 })
      setData(res?.data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary" className="bg-muted/50 text-foreground">Draf</Badge>
      case 'SENT': return <Badge variant="outline" className="text-primary border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-900/30 dark:text-primary">Terkirim</Badge>
      case 'ACCEPTED': return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Disetujui Pelanggan</Badge>
      case 'CONFIRMED':
      case 'CONVERTED': return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white">Dikonversi ke SO</Badge>
      case 'EXPIRED': return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">Kedaluwarsa</Badge>
      case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>
      case 'CANCELLED': return <Badge variant="destructive">Dibatalkan</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const filtered = (Array.isArray(data) ? data : []).filter(item => 
    item.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Penawaran Penjualan</h1>
          <p className="text-muted-foreground mt-1">Kelola dokumen penawaran harga dan proposal resmi untuk pelanggan Anda.</p>
        </div>
        <Link href="/sales/quotations/create">
            <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> Buat Penawaran Baru</Button>
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-[16px] font-semibold">Daftar Dokumen Penawaran</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Cari nomor penawaran atau pelanggan..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex p-12 justify-center"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[600px] md:min-w-full w-full text-sm">
                <thead className="bg-muted border-y border-border">
                  <tr>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">No. Penawaran</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Pelanggan</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Tanggal</th>
                    <th className="p-4 px-6 text-right text-[#526174] font-semibold text-[13px] tracking-wide">Total Nilai</th>
                    <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
                    <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-12 text-muted-foreground">Tidak ada dokumen penawaran ditemukan.</td></tr>
                  ) : filtered.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="py-3.5 px-6 font-semibold text-primary text-[13px] dark:text-primary">
                        <Link href={`/sales/quotations/${item.id}`} className="hover:underline">{item.quotation_number}</Link>
                      </td>
                      <td className="p-4 px-6 font-medium">{item.customer?.name || '-'}</td>
                      <td className="p-4 px-6 text-muted-foreground">{new Date(item.quotation_date || item.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 px-6 text-right font-medium">Rp {Number(item.total_amount || 0).toLocaleString('id-ID')}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]">{getStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/sales/quotations/${item.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">Detail</Button>
                          </Link>
                        </div>
                      </td>
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
