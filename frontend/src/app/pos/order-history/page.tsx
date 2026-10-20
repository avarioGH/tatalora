"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Button } from"@/components/ui/button"
import { ArrowLeft, Search, Filter, Receipt, Calendar, User, Clock, ArrowRight } from"lucide-react"
import { api } from"@/lib/api"
import { formatIDR } from"@/lib/utils"
import Link from"next/link"

export default function PosOrderHistoryPage() {
 const [loading, setLoading] = useState(true)
 const [orders, setOrders] = useState<any[]>([])
 const [searchQuery, setSearchQuery] = useState("")

 useEffect(() => {
 fetchOrders()
 }, [])

 const fetchOrders = async () => {
 try {
 setLoading(true)
 const res = await api.get('/pos/history')
 setOrders(res.data)
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const filteredOrders = orders.filter(o => 
 o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (o.customer?.name ||"").toLowerCase().includes(searchQuery.toLowerCase())
 )

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
 <div className="flex items-center gap-4">
 <Link href="/pos/new-transaction">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Riwayat Penjualan</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Pantau seluruh transaksi kasir yang telah berhasil dilakukan.</p>
 </div>
 </div>

 <Card className="border-border shadow-sm overflow-hidden">
 <div className="h-2 w-full bg-blue-500"></div>
 <CardHeader className="pb-4 border-b border-border/60">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <CardTitle className="flex items-center gap-2">
 <Receipt className="w-5 h-5 text-blue-500" /> Semua Transaksi
 </CardTitle>
 </div>
 <div className="flex items-center gap-2">
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input 
 placeholder="Cari No. Order / Pelanggan..." 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 bg-card border-border"
 />
 </div>
 <Button variant="outline" size="icon" className="shrink-0 border-border">
 <Filter className="w-4 h-4 text-muted-foreground" />
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? (
 <div className="py-20 text-center text-muted-foreground">Memuat riwayat transaksi...</div>
 ) : filteredOrders.length === 0 ? (
 <div className="py-20 text-center text-muted-foreground">Tidak ada transaksi yang ditemukan.</div>
 ) : (
 <div className="divide-y divide-slate-100 dark:divide-slate-800">
 {filteredOrders.map((order) => (
 <div key={order.id} className="p-4 sm:p-6 hover:bg-muted/30 dark:hover:bg-slate-900/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <span className="font-bold text-foreground dark:text-white">{order.order_number}</span>
 <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
 order.status === 'COMPLETED' ? 'bg-emerald-100 text-primary dark:bg-emerald-900/30 dark:text-primary' :
 order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
 }`}>
 {order.status}
 </span>
 </div>
 
 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
 <div className="flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5" />
 <span>{new Date(order.order_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Clock className="w-3.5 h-3.5" />
 <span>{new Date(order.order_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <User className="w-3.5 h-3.5" />
 <span>{order.customer?.name ||"Pelanggan Umum"}</span>
 </div>
 </div>
 </div>
 
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 sm:justify-end gap-6 sm:w-1/3">
 <div className="text-left sm:text-right">
 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total</div>
 <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
 {formatIDR(order.total_amount)}
 </div>
 </div>
 <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30">
 <ArrowRight className="w-5 h-5" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )
}
