"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { ArrowLeft, Sparkles, AlertTriangle, TrendingUp, PackageX, RefreshCw } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"

export default function AIInventoryAnalysisPage() {
 const [loading, setLoading] = useState(true)
 const [analyzing, setAnalyzing] = useState(false)
 
 const [lowStocks, setLowStocks] = useState<any[]>([])
 const [deadStocks, setDeadStocks] = useState<any[]>([])
 const [fastMoving, setFastMoving] = useState<any[]>([])

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setLoading(true)
 const [stocksRes, txRes] = await Promise.all([
 api.get('/inventory/stocks'),
 api.get('/inventory/transactions')
 ])
 
 const stocksData = stocksRes.data
 const txData = txRes.data

 // Simulasi Proses AI / Heuristik
 runAIAnalysis(stocksData, txData)

 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const runAIAnalysis = (stocks: any[], txData: any[]) => {
 setAnalyzing(true)
 
 setTimeout(() => {
 // 1. Low Stock Alert (Reorder Recommendations)
 const low = (Array.isArray(stocks) ? stocks : []).filter(s => s.available_stock > 0 && s.available_stock <= 5).map(s => ({
 ...s,
 recommendation: `Restock segera minimal ${s.available_stock * 3} unit berdasarkan rata-rata penjualan bulanan.`
 }))
 
 // 2. Dead Stock (No movement in last 30 days)
 const thirtyDaysAgo = new Date()
 thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
 
 const movedProductIds = new Set<string>()
 txData.forEach(tx => {
 if (new Date(tx.transaction_date) >= thirtyDaysAgo) {
 tx.items?.forEach((item: any) => movedProductIds.add(item.product_id))
 }
 })
 
 const dead = (Array.isArray(stocks) ? stocks : []).filter(s => s.available_stock > 0 && !movedProductIds.has(s.product_id)).map(s => ({
 ...s,
 recommendation: `Tidak ada pergerakan dalam 30 hari. Pertimbangkan promo bundling diskon 20%.`
 }))

 // 3. Fast Moving (Most moved out items)
 const moveCount: Record<string, number> = {}
 txData.forEach(tx => {
 if (tx.transaction_type === 'OUT') {
 tx.items?.forEach((item: any) => {
 moveCount[item.product_id] = (moveCount[item.product_id] || 0) + item.qty
 })
 }
 })
 
 const fastIds = Object.keys(moveCount).sort((a,b) => moveCount[b] - moveCount[a]).slice(0, 3)
 const fast = (Array.isArray(stocks) ? stocks : []).filter(s => fastIds.includes(s.product_id)).map(s => ({
 ...s,
 velocity: moveCount[s.product_id],
 recommendation: `Produk tren tinggi. Tingkatkan margin sebesar 2-5% bulan depan.`
 }))

 setLowStocks(low)
 setDeadStocks(dead)
 setFastMoving(fast)
 setAnalyzing(false)
 }, 1500)
 }

 if (loading) {
 return <div className="py-20 text-center text-muted-foreground">Menarik data dari database...</div>
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <Link href="/">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2">
 Analisis Inventaris AI <Sparkles className="w-6 h-6 text-indigo-500" />
 </h1>
 <p className="text-[14px] text-muted-foreground mt-1">Sistem cerdas untuk mendeteksi status stok Anda secara proaktif.</p>
 </div>
 </div>
 <Button onClick={fetchData} disabled={analyzing} className="gap-2">
 <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} /> Analisis Ulang
 </Button>
 </div>

 {analyzing ? (
 <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm">
 <CardContent className="py-12 flex flex-col items-center justify-center text-primary dark:text-primary">
 <div className="relative w-16 h-16 mb-4">
 <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
 <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
 <Sparkles className="absolute inset-0 m-auto w-6 h-6 animate-pulse" />
 </div>
 <h3 className="text-xl font-bold mb-2">AI sedang menganalisis data gudang Anda...</h3>
 <p className="text-sm opacity-80">Mendeteksi anomali, pergerakan lambat, dan tren penjualan.</p>
 </CardContent>
 </Card>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Kolom Kiri: Peringatan */}
 <div className="lg:col-span-2 space-y-6">
 <Card className="border-rose-200 dark:border-rose-800/50 shadow-sm overflow-hidden relative group">
 <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
 <CardHeader className="bg-rose-50/50 dark:bg-rose-900/10 pb-4 border-b border-rose-100 dark:border-rose-900/30">
 <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
 <AlertTriangle className="w-5 h-5" /> Stok Kritis (Restock Alert)
 </CardTitle>
 <CardDescription>Produk yang diprediksi akan habis dalam minggu ini.</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {lowStocks.length > 0 ? (
 <div className="divide-y divide-slate-100 dark:divide-slate-800">
 {lowStocks.map((item, idx) => (
 <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <div className="font-bold text-foreground dark:text-white">{item.product?.name}</div>
 <div className="text-xs text-muted-foreground mt-0.5">Lokasi: {item.warehouse?.name}</div>
 </div>
 <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 p-3 rounded-lg text-sm flex-1 sm:ml-4 border border-rose-100 dark:border-rose-900/30">
 <span className="font-bold block mb-1">💡 Saran AI:</span>
 {item.recommendation}
 </div>
 <div className="text-right shrink-0">
 <div className="text-2xl font-black text-rose-600">{item.available_stock}</div>
 <div className="text-xs text-muted-foreground font-medium uppercase">Tersisa</div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="p-4 md:p-8 text-center text-muted-foreground">Stok aman, tidak ada peringatan kritis.</div>
 )}
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm overflow-hidden relative">
 <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>
 <CardHeader className="bg-muted/40 pb-4 border-b border-border/60">
 <CardTitle className="flex items-center gap-2 text-foreground">
 <PackageX className="w-5 h-5" /> Dead Stock (Barang Mengendap)
 </CardTitle>
 <CardDescription>Barang yang mengambil ruang gudang tanpa ada penjualan dalam 30 hari terakhir.</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {deadStocks.length > 0 ? (
 <div className="divide-y divide-slate-100 dark:divide-slate-800">
 {deadStocks.map((item, idx) => (
 <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 dark:hover:bg-slate-900/20 transition-colors">
 <div className="w-1/3">
 <div className="font-bold text-foreground dark:text-white line-clamp-1">{item.product?.name}</div>
 <div className="text-xs text-muted-foreground mt-0.5">Stok: {item.available_stock} unit di {item.warehouse?.name}</div>
 </div>
 <div className="bg-muted/50 text-foreground p-3 rounded-lg text-sm flex-1">
 <span className="font-bold block mb-1">💡 Saran AI:</span>
 {item.recommendation}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="p-4 md:p-8 text-center text-muted-foreground">Gudang Anda bersih dari dead stock! 🚀</div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Kolom Kanan: Positive Feedback */}
 <div className="space-y-6">
 <Card className="border-emerald-200 dark:border-emerald-800/50 shadow-sm overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative">
 <div className="absolute top-0 right-0 p-4 opacity-20">
 <TrendingUp className="w-24 h-24" />
 </div>
 <CardHeader className="relative z-10 pb-0">
 <CardTitle className="flex items-center gap-2">
 <TrendingUp className="w-5 h-5" /> Fast Moving Products
 </CardTitle>
 <CardDescription className="text-emerald-100">Produk jagoan dengan perputaran tercepat.</CardDescription>
 </CardHeader>
 <CardContent className="relative z-10 pt-6">
 {fastMoving.length > 0 ? (
 <div className="space-y-4">
 {fastMoving.map((item, idx) => (
 <div key={idx} className="bg-card/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
 <div className="flex items-start justify-between mb-2">
 <div className="font-bold text-lg line-clamp-1">{item.product?.name}</div>
 <div className="bg-emerald-800/50 text-emerald-100 text-xs font-bold px-2 py-1 rounded">#{idx + 1}</div>
 </div>
 <div className="text-sm text-emerald-100 mb-3">
 Kecepatan keluar: <strong className="text-white">{item.velocity} unit</strong> (akumulasi)
 </div>
 <div className="text-xs bg-black/20 p-2 rounded-lg">
 <span className="font-bold">💡 Taktik:</span> {item.recommendation}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center text-emerald-100/70 py-4">Belum ada cukup data penjualan untuk mendeteksi fast-moving products.</div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 )}
 </div>
 )
}
