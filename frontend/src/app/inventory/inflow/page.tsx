"use client"
import { useEffect, useState } from 'react'
import { InventoryAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function InflowPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const { toast } = useToast()

  const fetchTallies = async () => {
    try {
      const res = await InventoryAPI.getStockInTallies()
      let fetchedData = res?.data || res || []
      
      // Filter by active warehouse if any
      const activeWarehouseJSON = localStorage.getItem("active_warehouse")
      if (activeWarehouseJSON && activeWarehouseJSON !== "null" && activeWarehouseJSON !== "undefined") {
        const activeWh = JSON.parse(activeWarehouseJSON)
        if (activeWh && activeWh.id) {
          fetchedData = fetchedData.filter((item: any) => item.warehouse_id === activeWh.id)
        }
      }
      
      setData(fetchedData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTallies()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data penerimaan ini? Stok akan otomatis dikurangi kembali.")) return;
    try {
      await InventoryAPI.deleteStockInTally(id)
      toast({ title: "Berhasil dihapus", description: "Stok telah dikurangi kembali." })
      fetchTallies()
    } catch(e) {
      toast({ title: "Gagal menghapus", variant: "destructive" })
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Input Stok Masuk</h1>
          <p className="text-muted-foreground mt-1">Riwayat penerimaan stok Produk harian.</p>
        </div>
        <Link href="/inventory/inflow/tambah">
          <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> Tambah Stok Masuk</Button>
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0 flex flex-col min-h-[400px]">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Nomor Teli</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Tanggal</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Gudang</th>
                    <th className="px-6 py-4 font-medium text-muted-foreground">Keterangan</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Rincian Produk</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Memuat data...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Belum ada data penerimaan.</td></tr>
                ) : (
                  paginatedData.map(item => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{item.tally_number}</td>
                      <td className="px-6 py-4">{new Date(item.tally_date).toLocaleDateString('id-ID')}</td>
                      <td className="px-6 py-4">{item.warehouse?.name || '-'}</td>
                        <td className="px-6 py-4 text-muted-foreground truncate max-w-[200px]">{item.notes || '-'}</td>
                      <td className="px-6 py-4">
                        {item.items && item.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {item.items.map((it: any, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {it.product?.name || 'Produk'} <strong className="ml-1">x{it.qty}</strong>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {!loading && data.length > 0 && (
            <div className="border-t p-4 flex items-center justify-between bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, data.length)} dari {data.length} data
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <div className="text-sm font-medium px-2">
                  Halaman {currentPage} / {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

