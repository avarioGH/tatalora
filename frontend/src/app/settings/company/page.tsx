"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Button } from"@/components/ui/button"
import { Label } from"@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { ArrowLeft, Settings, Building2, Globe, Banknote, Save, AlertCircle, CheckCircle2 } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"

export default function CompanySettingsPage() {
 const [loading, setLoading] = useState(true)
 const [processing, setProcessing] = useState(false)
 const [success, setSuccess] = useState("")
 const [error, setError] = useState("")

 const [formData, setFormData] = useState({
 companyName:"",
 currency:"IDR",
 timezone:"Asia/Jakarta",
 invoicePrefix:"INV-"
 })

 useEffect(() => {
 fetchSettings()
 }, [])

 const fetchSettings = async () => {
 try {
 setLoading(true)
 const res = await api.get('/platform/settings')
 if (res.data) {
 setFormData({
 companyName: res.data.company?.name ||"",
 currency: res.data.currency ||"IDR",
 timezone: res.data.timezone ||"Asia/Jakarta",
 invoicePrefix: res.data.invoice_prefix ||"INV-"
 })
 }
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault()
 setProcessing(true)
 setError("")
 setSuccess("")
 
 try {
 await api.post('/platform/settings', formData)
 setSuccess("Pengaturan sistem berhasil disimpan.")
 setTimeout(() => setSuccess(""), 3000)
 } catch (err: any) {
 setError((err.response?.data?.error?.message || err.response?.data?.message) ||"Gagal menyimpan pengaturan.")
 } finally {
 setProcessing(false)
 }
 }

 if (loading) {
 return <div className="py-20 text-center text-muted-foreground">Memuat pengaturan sistem...</div>
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
 <div className="flex items-center gap-4">
 <Link href="/">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Pengaturan Sistem</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Konfigurasi dasar aplikasi, zona waktu, dan format mata uang.</p>
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

 <Card className="border-border shadow-sm border-t-4 border-t-slate-800 dark:border-t-slate-400">
 <form onSubmit={handleSave}>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Settings className="w-5 h-5 text-muted-foreground" /> Preferensi Global
 </CardTitle>
 <CardDescription>Perubahan pada pengaturan ini akan berdampak pada seluruh pengguna (Global).</CardDescription>
 </CardHeader>
 <CardContent className="space-y-8">
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 
 <div className="space-y-6">
 <div className="space-y-2">
 <Label className="flex items-center gap-2 font-semibold text-foreground">
 <Building2 className="w-4 h-4 text-muted-foreground" /> Nama Perusahaan (Tenant)
 </Label>
 <Input 
 value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})}
 className="bg-muted/40 border-border h-11"
 />
 <p className="text-xs text-muted-foreground">Akan tampil di struk dan laporan PDF.</p>
 </div>
 
 <div className="space-y-2">
 <Label className="flex items-center gap-2 font-semibold text-foreground">
 <Globe className="w-4 h-4 text-muted-foreground" /> Zona Waktu Sistem
 </Label>
 <Select value={formData.timezone} onValueChange={val => setFormData({...formData, timezone: val as string})}>
 <SelectTrigger className="bg-muted/40 border-border h-11">
 <SelectValue placeholder="Pilih Zona Waktu" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Asia/Jakarta">WIB (Asia/Jakarta)</SelectItem>
 <SelectItem value="Asia/Makassar">WITA (Asia/Makassar)</SelectItem>
 <SelectItem value="Asia/Jayapura">WIT (Asia/Jayapura)</SelectItem>
 </SelectContent>
 </Select>
 <p className="text-xs text-muted-foreground">Mempengaruhi pencatatan waktu transaksi dan absensi karyawan.</p>
 </div>
 </div>

 <div className="space-y-6">
 <div className="space-y-2">
 <Label className="flex items-center gap-2 font-semibold text-foreground">
 <Banknote className="w-4 h-4 text-muted-foreground" /> Format Mata Uang Utama
 </Label>
 <Select value={formData.currency} onValueChange={val => setFormData({...formData, currency: val as string})}>
 <SelectTrigger className="bg-muted/40 border-border h-11">
 <SelectValue placeholder="Pilih Mata Uang" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="IDR">Rupiah (IDR)</SelectItem>
 <SelectItem value="USD">US Dollar (USD)</SelectItem>
 <SelectItem value="SGD">Singapore Dollar (SGD)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="font-semibold text-foreground">Prefix Invoice / Tagihan</Label>
 <Input 
 value={formData.invoicePrefix} onChange={e => setFormData({...formData, invoicePrefix: e.target.value.toUpperCase()})}
 className="bg-muted/40 border-border h-11 font-mono uppercase"
 />
 <p className="text-xs text-muted-foreground">Contoh format: {formData.invoicePrefix}20260727-0001</p>
 </div>
 </div>

 </div>

 <div className="pt-6 border-t border-border/60 flex justify-end">
 <Button type="submit" disabled={processing} className="bg-slate-900 hover:bg-slate-800 dark:bg-card dark:hover:bg-slate-200 dark:text-foreground text-white min-w-[150px] gap-2 h-11">
 {processing ?"Menyimpan..." : <><Save className="w-4 h-4"/> Simpan Pengaturan</>}
 </Button>
 </div>
 </CardContent>
 </form>
 </Card>
 </div>
 )
}
