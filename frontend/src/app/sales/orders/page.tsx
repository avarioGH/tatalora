"use client"
import { useEffect, useState } from 'react'
import { B2BApi } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search, Filter, Trash2, Truck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SalesOrdersPage() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await B2BApi.getOrders({ page: 1, limit: 100 })
      setData(res?.data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pesanan ${number}?`)) return
    try {
      await B2BApi.deleteOrder(id)
      fetchOrders()
    } catch (err: any) {
      alert("Gagal menghapus pesanan: " + (err.response?.data?.message || err.message))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">Menunggu</Badge>
      case 'CONFIRMED': return <Badge className="bg-blue-600 text-white">Dikonfirmasi</Badge>
      case 'DELIVERED': return <Badge className="bg-emerald-600 text-white">Terkirim</Badge>
      case 'COMPLETED': return <Badge className="bg-emerald-700 text-white">Selesai</Badge>
      case 'INVOICED': return <Badge variant="outline" className="border-emerald-500 text-primary">Tertagih</Badge>
      case 'CANCELLED': return <Badge variant="destructive">Dibatalkan</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const filtered = (Array.isArray(data) ? data : []).filter(item => 
    item.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Pesanan Penjualan</h1>
          <p className="text-muted-foreground mt-1">Kelola pesanan yang telah dikonfirmasi dan proses pemenuhan.</p>
        </div>
        <Link href="/sales/orders/create">
          <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> Buat Pesanan Baru</Button>
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-[16px] font-semibold">Daftar Pesanan Penjualan</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Cari pesanan..." 
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
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Nomor Pesanan</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Pelanggan</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Tanggal</th>
                    <th className="p-4 px-6 text-right text-[#526174] font-semibold text-[13px] tracking-wide">Total</th>
                    <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
                    <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-12 text-muted-foreground">Tidak ada pesanan penjualan ditemukan.</td></tr>
                  ) : filtered.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="py-3.5 px-6 font-semibold text-primary text-[13px] dark:text-primary">
                        <Link href={`/sales/orders/${item.id}`} className="hover:underline">{item.order_number}</Link>
                      </td>
                      <td className="p-4 px-6 font-medium">{item.customer?.name || '-'}</td>
                      <td className="p-4 px-6 text-muted-foreground">{new Date(item.order_date || item.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 px-6 text-right font-medium">Rp {Number(item.total_amount || 0).toLocaleString('id-ID')}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]">{getStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/sales/deliveries/create?so_id=${item.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 gap-1">
                              <Truck className="w-3.5 h-3.5" /> Surat Jalan
                            </Button>
                          </Link>
                          <Link href={`/sales/orders/${item.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">Detail</Button>
                          </Link>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8" onClick={() => handleDelete(item.id, item.order_number)}><Trash2 className="w-4 h-4" /></Button>
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
