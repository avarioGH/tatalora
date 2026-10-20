"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { PosAPI } from "@/lib/api"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { Search, DollarSign, Receipt, TrendingUp, CheckCircle, CreditCard, Banknote } from "lucide-react"
import { FinanceAPI } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select as UISelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function PosReports() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  
  // Payment Modal States
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [payAmount, setPayAmount] = useState<number | ''>('')
  const [payMethod, setPayMethod] = useState('Transfer')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payRef, setPayRef] = useState('')
  const [isPaying, setIsPaying] = useState(false)

  const handleOpenPay = (order: any) => {
    const paid = (order.allocations || []).reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
    const outst = order.total_amount - paid
    
    setSelectedOrder(order)
    setPayAmount(outst > 0 ? outst : 0)
    setPayDate(new Date().toISOString().split('T')[0])
    setPayMethod('Transfer')
    setPayRef('')
    setPayModalOpen(true)
  }

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0 || !selectedOrder) return alert('Nominal tidak valid')
    setIsPaying(true)
    try {
      await FinanceAPI.createPayment({
        partnerId: selectedOrder.partner_id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        paymentDate: payDate,
        reference: payRef,
        allocations: [{ salesOrderId: selectedOrder.id, amount: Number(payAmount) }]
      })
      alert('Pembayaran piutang berhasil dicatat!')
      setPayModalOpen(false)
      fetchData() // Refresh list
    } catch(err: any) {
      alert('Gagal: ' + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message))
    } finally {
      setIsPaying(false)
    }
  }
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await PosAPI.getOrderHistory()
      setHistory(Array.isArray(res) ? res : (res?.data || []))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = history.filter(h => {
    const matchSearch = (h.order_number || "").toLowerCase().includes(search.toLowerCase()) ||
                        (h.customer?.name || "").toLowerCase().includes(search.toLowerCase())
    const isPaid = h.payment_status === "PAID"
    const matchStatus = statusFilter === "ALL" ? true : statusFilter === "PAID" ? isPaid : !isPaid
    return matchSearch && matchStatus
  })

  const totalRevenue = filtered.reduce((sum, h) => sum + (h.total_amount || 0), 0)
  const totalTransactions = filtered.length
  
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Laporan POS</h1>
        <p className="text-muted-foreground mt-1">Analisis penjualan dan histori transaksi Point of Sale.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalRevenue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground">Berdasarkan filter saat ini</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Nota penjualan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions).toLocaleString("id-ID") : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per transaksi</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
          <div>
            <CardTitle>Histori Transaksi</CardTitle>
            <CardDescription>Daftar lengkap transaksi POS</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Cari nota atau pelanggan..." 
                className="pl-8" 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="w-full sm:w-48">
              <UISelect value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "ALL"); setCurrentPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Semua Status"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="PAID">Lunas</SelectItem>
                  <SelectItem value="PIUTANG">Piutang / Belum Lunas</SelectItem>
                </SelectContent>
              </UISelect>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Nota</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Memuat data...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Tidak ada transaksi ditemukan.</TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.order_number || "-"}</TableCell>
                      <TableCell>{new Date(item.order_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</TableCell>
                      <TableCell>{item.customer?.name || "Pelanggan Umum"}</TableCell>
                      <TableCell>{item.payment_method || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.payment_status === "PAID" ? "bg-green-100 text-green-700" : item.payment_status === "PARTIALLY_PAID" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                          {item.payment_status === "PAID" ? "LUNAS" : item.payment_status === "PARTIALLY_PAID" ? "PIUTANG" : "BELUM BAYAR"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">Rp {(item.total_amount || 0).toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right">
                        {item.payment_status !== "PAID" && (
                          <Button variant="outline" size="sm" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleOpenPay(item)}>Bayar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>
    
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pencatatan Pembayaran Piutang</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted border rounded text-sm space-y-1">
              <p><span className="text-muted-foreground">Nota:</span> <span className="font-medium">{selectedOrder?.order_number}</span></p>
              <p><span className="text-muted-foreground">Pelanggan:</span> <span className="font-medium">{selectedOrder?.customer?.name || 'Umum'}</span></p>
              <p><span className="text-muted-foreground">Total Tagihan:</span> <span className="font-medium">Rp {(selectedOrder?.total_amount || 0).toLocaleString('id-ID')}</span></p>
            </div>
            
            <div className="space-y-2">
              <Label>Nominal Pembayaran (Rp)</Label>
              <Input type="number" min="1" value={payAmount} onChange={e => setPayAmount(Number(e.target.value) || '')} placeholder="Nominal Rp" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Bayar</Label>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Metode</Label>
                <UISelect value={payMethod} onValueChange={(v) => setPayMethod(v || "")}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transfer">Transfer Bank</SelectItem>
                    <SelectItem value="Cash">Cash / Tunai</SelectItem>
                    <SelectItem value="Debit">Debit Card</SelectItem>
                    <SelectItem value="Kredit">Kartu Kredit</SelectItem>
                  </SelectContent>
                </UISelect>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Referensi (Opsional)</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Misal: TF BCA" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Batal</Button>
            <Button onClick={handlePay} disabled={isPaying || !payAmount}>{isPaying ? 'Memproses...' : 'Simpan Pembayaran'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

