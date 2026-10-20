"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Button } from"@/components/ui/button"
import { Label } from"@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { ArrowLeft, Ticket, Plus, Tag, CheckCircle2, AlertCircle } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"
import { formatIDR } from"@/lib/utils"

export default function VouchersPage() {
 const [loading, setLoading] = useState(true)
 const [processing, setProcessing] = useState(false)
 const [vouchers, setVouchers] = useState<any[]>([])
 
 const [showForm, setShowForm] = useState(false)
 const [success, setSuccess] = useState("")
 const [error, setError] = useState("")

 const [formData, setFormData] = useState({
 code:"",
 name:"",
 discount_type:"NOMINAL",
 discount_value:"",
 min_purchase:"",
 max_discount:"",
 quota:"100",
 valid_from: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
 valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
 })

 useEffect(() => {
 fetchVouchers()
 }, [])

 const fetchVouchers = async () => {
 try {
 setLoading(true)
 const res = await api.get('/vouchers')
 setVouchers(res.data)
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const handleCreateVoucher = async (e: React.FormEvent) => {
 e.preventDefault()
 setProcessing(true)
 setError("")
 
 try {
 const payload = {
 ...formData,
 discount_value: Number(formData.discount_value.replace(/[^0-9.-]+/g,"")),
 min_purchase: formData.min_purchase ? Number(formData.min_purchase.replace(/[^0-9.-]+/g,"")) : 0,
 max_discount: formData.max_discount ? Number(formData.max_discount.replace(/[^0-9.-]+/g,"")) : 0,
 quota: Number(formData.quota)
 }
 
 await api.post('/vouchers', payload)
 setSuccess("Voucher berhasil dibuat!")
 setShowForm(false)
 fetchVouchers()
 
 setTimeout(() => setSuccess(""), 3000)
 } catch (err: any) {
 setError((err.response?.data?.error?.message || err.response?.data?.message) ||"Gagal membuat voucher")
 } finally {
 setProcessing(false)
 }
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <Link href="/customers">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Promo & Voucher</h1>
 <p className="text-muted-foreground mt-1">Buat kode diskon untuk memanjakan pelanggan Anda.</p>
 </div>
 </div>
 {!showForm && (
 <Button onClick={() => setShowForm(true)} className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
 <Plus className="w-4 h-4" /> Buat Voucher Baru
 </Button>
 )}
 </div>

 {success && (
 <div className="bg-emerald-50 dark:bg-emerald-900/30 text-primary dark:text-primary p-4 rounded-lg flex items-center gap-3 border border-emerald-200 dark:border-emerald-800">
 <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
 <p className="font-medium text-sm">{success}</p>
 </div>
 )}

 {showForm ? (
 <Card className="border-border shadow-sm overflow-hidden group hover:border-pink-500 transition-colors">
 <div className="h-2 w-full bg-pink-500"></div>
 <form onSubmit={handleCreateVoucher}>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Ticket className="w-5 h-5 text-pink-500" /> Detail Voucher Baru
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 
 {error && (
 <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-lg flex items-center gap-3 border border-rose-200 dark:border-rose-800">
 <AlertCircle className="w-5 h-5 flex-shrink-0" />
 <p className="font-medium text-sm">{error}</p>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label>Kode Voucher <span className="text-rose-500">*</span></Label>
 <Input 
 required placeholder="Misal: MERDEKA50" 
 value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
 className="font-mono uppercase bg-card"
 />
 </div>
 <div className="space-y-2">
 <Label>Nama Promo <span className="text-rose-500">*</span></Label>
 <Input 
 required placeholder="Misal: Diskon Kemerdekaan 50rb" 
 value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
 className="bg-card"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/40 rounded-xl border border-border/60">
 <div className="space-y-2">
 <Label>Tipe Diskon</Label>
 <Select value={formData.discount_type} onValueChange={(val) => setFormData({...formData, discount_type: val as string})}>
 <SelectTrigger className="bg-card">
 <SelectValue placeholder="Pilih Tipe" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="NOMINAL">Potongan Rupiah (Nominal)</SelectItem>
 <SelectItem value="PERCENTAGE">Potongan Persen (%)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>Nilai Diskon <span className="text-rose-500">*</span></Label>
 <div className="relative">
 {formData.discount_type === 'NOMINAL' && <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">Rp</div>}
 <Input 
 required type="text"
 value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})}
 className={formData.discount_type === 'NOMINAL' ? 'pl-9 bg-card ' : 'pr-9 bg-card '}
 />
 {formData.discount_type === 'PERCENTAGE' && <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">%</div>}
 </div>
 </div>

 <div className="space-y-2">
 <Label>Min. Transaksi (Opsional)</Label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">Rp</div>
 <Input 
 type="text" value={formData.min_purchase} onChange={e => setFormData({...formData, min_purchase: e.target.value})}
 className="pl-9 bg-card"
 />
 </div>
 </div>
 {formData.discount_type === 'PERCENTAGE' && (
 <div className="space-y-2">
 <Label>Maks. Diskon Rupiah (Opsional)</Label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">Rp</div>
 <Input 
 type="text" value={formData.max_discount} onChange={e => setFormData({...formData, max_discount: e.target.value})}
 className="pl-9 bg-card"
 />
 </div>
 </div>
 )}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="space-y-2">
 <Label>Kuota Penggunaan</Label>
 <Input 
 type="number" min="1" value={formData.quota} onChange={e => setFormData({...formData, quota: e.target.value})}
 className="bg-card"
 />
 </div>
 <div className="space-y-2">
 <Label>Berlaku Dari</Label>
 <Input 
 type="date" required value={formData.valid_from} onChange={e => setFormData({...formData, valid_from: e.target.value})}
 className="bg-card"
 />
 </div>
 <div className="space-y-2">
 <Label>Berlaku Sampai</Label>
 <Input 
 type="date" required value={formData.valid_until} onChange={e => setFormData({...formData, valid_until: e.target.value})}
 className="bg-card"
 />
 </div>
 </div>

 <div className="flex justify-end gap-3 pt-4">
 <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
 <Button type="submit" disabled={processing} className="bg-pink-600 hover:bg-pink-700 text-white min-w-[120px]">
 {processing ?"Menyimpan..." :"Simpan Voucher"}
 </Button>
 </div>
 </CardContent>
 </form>
 </Card>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {loading ? (
 <div className="col-span-full py-20 text-center text-muted-foreground">Memuat daftar voucher...</div>
 ) : vouchers.length === 0 ? (
 <div className="col-span-full py-20 text-center text-muted-foreground">
 <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
 <p>Belum ada voucher yang dibuat.</p>
 </div>
 ) : (
 vouchers.map(voucher => (
 <div key={voucher.id} className={`bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col ${voucher.status ? 'border-pink-200 dark:border-pink-900/50' : 'border-border opacity-60'}`}>
 <div className={`p-4 border-b border-dashed flex items-center justify-between ${voucher.status ? 'bg-pink-50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-900/30' : 'bg-muted/40 border-border'}`}>
 <div className="flex items-center gap-2 font-mono font-bold tracking-wider">
 <Tag className={`w-4 h-4 ${voucher.status ? 'text-pink-500' : 'text-muted-foreground'}`} />
 <span className={voucher.status ? 'text-pink-600 dark:text-pink-400' : 'text-muted-foreground'}>{voucher.code}</span>
 </div>
 <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${voucher.status ? 'bg-emerald-100 text-primary dark:bg-emerald-900/30 dark:text-primary' : 'bg-slate-200 text-muted-foreground dark:text-muted-foreground'}`}>
 {voucher.status ? 'Aktif' : 'Nonaktif'}
 </div>
 </div>
 <div className="p-4 flex-1 flex flex-col justify-between gap-4">
 <div>
 <h3 className="font-bold text-foreground dark:text-white line-clamp-1" title={voucher.name}>{voucher.name}</h3>
 <div className="text-2xl font-black text-foreground dark:text-white mt-1">
 {voucher.discount_type === 'PERCENTAGE' ? `${voucher.discount_value}%` : formatIDR(voucher.discount_value)}
 {voucher.discount_type === 'PERCENTAGE' && <span className="text-xs text-muted-foreground font-normal block">Maks. {formatIDR(voucher.max_discount || 0)}</span>}
 </div>
 </div>
 
 <div className="space-y-1.5 text-xs text-muted-foreground">
 <div className="flex justify-between">
 <span>Min. Belanja:</span>
 <span className="font-medium text-foreground">{formatIDR(voucher.min_purchase || 0)}</span>
 </div>
 <div className="flex justify-between">
 <span>Masa Berlaku:</span>
 <span className="font-medium text-foreground">
 {new Date(voucher.valid_until).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
 </span>
 </div>
 <div className="flex justify-between">
 <span>Kuota:</span>
 <span className="font-medium text-foreground">{voucher.used_count} / {voucher.quota}</span>
 </div>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 )}
 </div>
 )
}
