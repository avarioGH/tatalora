"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { InventoryAPI } from "@/lib/api"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { Search } from "lucide-react"

export default function ReportsStock() {
  const [stocks, setStocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchStocks();
    const handleWhChange = () => {
      fetchStocks();
    };
    window.addEventListener('warehouse-changed', handleWhChange);
    return () => window.removeEventListener('warehouse-changed', handleWhChange);
  }, [])

  const fetchStocks = async () => {
    try {
      setLoading(true)
      const res = await InventoryAPI.getStocks()
      // Pastikan res berupa array
      setStocks(Array.isArray(res) ? res : (res?.data || []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = stocks.filter(s => 
    s.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.warehouse?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">Laporan Stok</h1>
        <p className="text-muted-foreground mt-1">Pantau jumlah stok fisik dan ketersediaan barang di seluruh gudang.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
          <div>
            <CardTitle>Daftar Stok Produk</CardTitle>
            <CardDescription>Berdasarkan produk dan gudang penempatan saat ini</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Cari produk atau gudang..." 
              className="pl-8" 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Gudang</TableHead>
                  <TableHead className="text-right">Stok Fisik</TableHead>
                  <TableHead className="text-right">Stok Tersedia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Memuat data real-time...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      {search ? "Pencarian tidak ditemukan." : "Belum ada data stok sama sekali."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((stock: any) => (
                    <TableRow key={stock.id}>
                      <TableCell className="font-medium">{stock.product?.name || "Produk Tanpa Nama"}</TableCell>
                      <TableCell>{stock.warehouse?.name || "Gudang Tidak Diketahui"}</TableCell>
                      <TableCell className="text-right font-semibold">{stock.current_stock || 0}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">{stock.available_stock || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>
    </div>
  )
}
