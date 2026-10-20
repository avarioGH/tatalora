"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { Button } from"@/components/ui/button"
import { ArrowLeft, PlayCircle, StopCircle, Wallet, Clock, User, AlertCircle, CheckCircle2 } from"lucide-react"
import { api } from"@/lib/api"
import { formatIDR } from"@/lib/utils"
import Link from"next/link"
import { useRouter } from"next/navigation"

export default function PosShiftPage() {
 const router = useRouter()
 const [loading, setLoading] = useState(true)
 const [processing, setProcessing] = useState(false)
 const [error, setError] = useState("")
 const [success, setSuccess] = useState("")

 const [currentShift, setCurrentShift] = useState<any>(null)
 const [user, setUser] = useState<any>(null)
 const [shiftStats, setShiftStats] = useState({ cashSales: 0, nonCashSales: 0 })
 const [warehouses, setWarehouses] = useState<any[]>([])

 const [openFormData, setOpenFormData] = useState({
 warehouseId:"",
 startingCash:""
 })

 const [closeFormData, setCloseFormData] = useState({
 endingCash:""
 })

 useEffect(() => {
 const userStr = localStorage.getItem("erp_user")
 if (userStr) setUser(JSON.parse(userStr))
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setLoading(true)
 const [shiftRes, whRes] = await Promise.all([
 api.get('/pos/shift'),
 api.get('/inventory/warehouses')
 ])
 
 setCurrentShift(shiftRes.data)
 setWarehouses(whRes.data)

 if (!shiftRes.data && whRes.data.length > 0) {
 const storedActive = localStorage.getItem("active_warehouse")
 if (storedActive && storedActive !=="undefined" && storedActive !=="null") {
 try {
 const parsed = JSON.parse(storedActive)
 if (parsed && parsed.id) {
 setOpenFormData(prev => ({ ...prev, warehouseId: parsed.id }))
 return
 }
 } catch (e) {
 console.error(e)
 }
 }
 setOpenFormData(prev => ({ ...prev, warehouseId: whRes.data[0].id }))
 }
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const handleOpenShift = async (e: React.FormEvent) => {
 e.preventDefault()
 setProcessing(true)
 setError("")
 
 if (!openFormData.warehouseId) {
 setError("Pilih gudang / lokasi toko terlebih dahulu")
 setProcessing(false)
 return
 }

 try {
 const payload = {
 warehouseId: openFormData.warehouseId,
 startingCash: Number(openFormData.startingCash.replace(/[^0-9.-]+/g,"")) || 0
 }
 await api.post('/pos/shift/open', payload)
 setSuccess("Shift berhasil dibuka!")
 
 // Auto redirect to pos after 1.5s
 setTimeout(() => {
 router.push('/pos/new-transaction')
 }, 1500)
 
 fetchData()
 } catch (err: any) {
 setError((err.response?.data?.error?.message || err.response?.data?.message) ||"Gagal membuka shift")
 } finally {
 setProcessing(false)
 }
 }

 const handleCloseShift = async (e: React.FormEvent) => {
 e.preventDefault()
 setProcessing(true)
 setError("")
 
 try {
 const payload = {
 endingCash: Number(closeFormData.endingCash.replace(/[^0-9.-]+/g,"")) || 0
 }
 await api.post('/pos/shift/close', payload)
 setSuccess("Shift berhasil ditutup!")
 setTimeout(() => {
 setSuccess("")
 }, 3000)
 fetchData()
 } catch (err: any) {
 setError((err.response?.data?.error?.message || err.response?.data?.message) ||"Gagal menutup shift")
 } finally {
 setProcessing(false)
 }
 }

 if (loading) {
 return <div className="py-20 text-center text-muted-foreground">Memuat data shift...</div>
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-10">
 <div className="flex items-center gap-4">
 <Link href="/pos/new-transaction">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Shift & Kasir</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Kelola pembukaan dan penutupan shift kasir harian.</p>
 </div>
 </div>

 {success && (
 <div className="bg-emerald-50 dark:bg-emerald-900/30 text-primary dark:text-primary p-4 rounded-lg flex items-center gap-3 border border-emerald-200 dark:border-emerald-800">
 <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
 <p className="font-medium text-sm">{success}</p>
 </div>
 )}
 
 {error && (
 <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-lg flex items-center gap-3 border border-rose-200 dark:border-rose-800">
 <AlertCircle className="w-5 h-5 flex-shrink-0" />
 <p className="font-medium text-sm">{error}</p>
 </div>
 )}

 {currentShift ? (
 <Card className="border-border shadow-sm overflow-hidden group hover:border-amber-500 transition-colors">
 <div className="h-2 w-full bg-amber-500"></div>
 <form onSubmit={handleCloseShift}>
 <CardHeader className="pb-4 border-b border-border/40">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
 <div>
 <CardTitle className="flex items-center gap-2">
 <StopCircle className="w-5 h-5 text-amber-500" /> Tutup Shift Kasir
 </CardTitle>
 <CardDescription className="mt-1.5">Anda saat ini memiliki shift yang sedang aktif.</CardDescription>
 </div>
 <div className="bg-emerald-100 text-primary dark:bg-emerald-900/30 dark:text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Aktif
 </div>
 </div>
 </CardHeader>
 <CardContent className="space-y-6">
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border/60">
 <div className="space-y-1">
 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Waktu Mulai</div>
 <div className="font-semibold text-foreground dark:text-white">
 {new Date(currentShift.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
 </div>
 </div>
 <div className="space-y-1">
 <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Modal Awal</div>
 <div className="font-semibold text-foreground dark:text-white">
 {formatIDR(currentShift.starting_cash)}
 </div>
 </div>
 </div>

  <div className="space-y-3 pt-4">
    <h4 className="font-semibold text-sm text-foreground">Ringkasan Transaksi Shift Ini</h4>
    <div className="bg-card border border-border rounded-lg divide-y divide-border/60">
      <div className="flex justify-between items-center p-3 text-sm">
        <span className="text-muted-foreground">Pemasukan Tunai</span>
        <span className="font-medium text-emerald-600">{formatIDR(shiftStats.cashSales)}</span>
      </div>
      <div className="flex justify-between items-center p-3 text-sm">
        <span className="text-muted-foreground">Pemasukan Non-Tunai (Bank/EDC)</span>
        <span className="font-medium text-blue-600">{formatIDR(shiftStats.nonCashSales)}</span>
      </div>
      <div className="flex justify-between items-center p-3 text-sm bg-muted/20">
        <span className="font-semibold text-foreground">Ekspektasi Uang Fisik di Laci</span>
        <span className="font-bold text-foreground">{formatIDR(currentShift.starting_cash + shiftStats.cashSales)}</span>
      </div>
    </div>
  </div>

  <div className="space-y-3 pt-4 border-t border-border/60">
    <Label htmlFor="endingCash" className="text-base font-semibold">Uang Fisik Aktual di Laci (Saat Ini) <span className="text-rose-500">*</span></Label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground font-medium">Rp</div>
 <Input 
 id="endingCash"
 type="text"
 required
 placeholder="Hitung jumlah fisik uang di laci..."
 value={closeFormData.endingCash}
 onChange={(e) => setCloseFormData({endingCash: e.target.value})}
 className="pl-12 h-14 text-xl font-bold bg-card border-border dark:border-border focus-visible:ring-amber-500"
 />
 </div>
 <p className="text-xs text-muted-foreground">Masukkan total fisik uang tunai yang ada di laci kasir sekarang untuk dicocokkan dengan sistem.</p>
 </div>

 <Button type="submit" disabled={processing} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-sm shadow-amber-500/20">
 {processing ?"Memproses..." :"Tutup Shift Sekarang"}
 </Button>
 </CardContent>
 </form>
 </Card>
 ) : (
 <Card className="border-border shadow-lg overflow-hidden transition-colors w-full max-w-2xl mx-auto">
   <div className="h-2 w-full bg-indigo-600"></div>
   <form onSubmit={handleOpenShift}>
     <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200">
             <User className="w-6 h-6" />
           </div>
           <div>
             <CardTitle className="text-xl">Buka Shift Kasir</CardTitle>
             <CardDescription className="mt-1 font-medium text-foreground">Halo, {user?.name || "Kasir"}!</CardDescription>
           </div>
         </div>
         <div className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
           <Clock className="w-3.5 h-3.5" />
           {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
         </div>
       </div>
     </CardHeader>
     <CardContent className="space-y-6 pt-6">
       
       <div className="space-y-2">
         <Label className="font-semibold text-foreground">Lokasi Toko / Gudang <span className="text-rose-500">*</span></Label>
         <Select value={openFormData.warehouseId} onValueChange={(val) => setOpenFormData({...openFormData, warehouseId: val as string})}>
           <SelectTrigger className="bg-card border-border h-12">
             <SelectValue placeholder="Pilih Lokasi" />
           </SelectTrigger>
           <SelectContent>
             {warehouses.map(wh => (
               <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>

       <div className="space-y-3 pt-2">
         <Label htmlFor="startingCash" className="text-base font-semibold text-foreground">Modal Awal di Laci <span className="text-rose-500">*</span></Label>
         <div className="relative">
           <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground font-medium">Rp</div>
           <Input 
             id="startingCash"
             type="text"
             required
             placeholder="Misal: 500.000"
             value={openFormData.startingCash}
             onChange={(e) => setOpenFormData({...openFormData, startingCash: e.target.value})}
             className="pl-12 h-14 text-xl font-bold bg-card border-border focus-visible:ring-indigo-600"
           />
         </div>
         <p className="text-xs text-muted-foreground">Hitung dan masukkan jumlah uang tunai fisik (uang kembalian) yang ada di laci saat ini.</p>
       </div>

       <Button type="submit" disabled={processing} className="w-full h-12 font-bold text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20">
         {processing ? "Memproses..." : "Mulai Shift & Buka Kasir"}
       </Button>
     </CardContent>
   </form>
 </Card>
 )}
 </div>
 )
}
