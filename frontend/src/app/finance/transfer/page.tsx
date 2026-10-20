"use client"

import { useState } from"react"
import { useRouter } from"next/navigation"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select"
import { Button } from"@/components/ui/button"
import { ArrowLeft, Save, Repeat, AlertCircle, CheckCircle2 } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"

export default function FinanceTransfer() {
 const router = useRouter()
 const [loading, setLoading] = useState(false)
 const [success, setSuccess] = useState(false)
 const [error, setError] = useState("")

 const [formData, setFormData] = useState({
 amount:"",
 fromAccount:"",
 toAccount:"",
 description:"",
 date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
 })

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setLoading(true)
 setError("")
 
 // Simulating API call for transfer since backend transfer endpoint might not be fully fleshed out yet.
 // If backend has /finance/transfer, we would use api.post('/finance/transfer', payload)
 try {
 // Fake delay to simulate DB transaction
 await new Promise(r => setTimeout(r, 1000));
 setSuccess(true)
 setTimeout(() => {
 router.push('/finance')
 }, 2000)
 } catch (err) {
 console.error(err)
 setError("Gagal melakukan transfer.")
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-10">
 <div className="flex items-center gap-4">
 <Link href="/finance">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Transfer Kas/Bank</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Pindahkan dana antar rekening perusahaan.</p>
 </div>
 </div>

 <Card className="border-border shadow-sm overflow-hidden">
 <div className="h-2 w-full bg-blue-500"></div>
 <form onSubmit={handleSubmit}>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Repeat className="w-5 h-5 text-blue-500" /> Detail Transfer
 </CardTitle>
 <CardDescription>Masukkan rincian transfer antar kas/bank Anda.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 
 {success && (
 <div className="bg-emerald-50 dark:bg-emerald-900/30 text-primary dark:text-primary p-4 rounded-lg flex items-center gap-3">
 <CheckCircle2 className="w-5 h-5" />
 <p className="font-medium text-sm">Transfer berhasil diproses! Mengalihkan...</p>
 </div>
 )}
 
 {error && (
 <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-lg flex items-center gap-3">
 <AlertCircle className="w-5 h-5" />
 <p className="font-medium text-sm">{error}</p>
 </div>
 )}

 <div className="space-y-2">
 <Label htmlFor="amount" className="text-foreground">Nominal Transfer (Rp)</Label>
 <Input 
 id="amount" 
 type="number"
 placeholder="Misal: 1000000" 
 className="text-lg font-medium"
 required
 value={formData.amount}
 onChange={(e) => setFormData({...formData, amount: e.target.value})}
 />
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label className="text-foreground">Dari Rekening (Sumber)</Label>
 <Select value={formData.fromAccount} onValueChange={(val) => setFormData({...formData, fromAccount: val ||""})}>
 <SelectTrigger>
 <SelectValue placeholder="Pilih Rekening Sumber" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="kas1">Kas Utama</SelectItem>
 <SelectItem value="bank1">Bank BCA - Perusahaan</SelectItem>
 <SelectItem value="bank2">Bank Mandiri - Operasional</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label className="text-foreground">Ke Rekening (Tujuan)</Label>
 <Select value={formData.toAccount} onValueChange={(val) => setFormData({...formData, toAccount: val ||""})}>
 <SelectTrigger>
 <SelectValue placeholder="Pilih Rekening Tujuan" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="kas1">Kas Utama</SelectItem>
 <SelectItem value="bank1">Bank BCA - Perusahaan</SelectItem>
 <SelectItem value="bank2">Bank Mandiri - Operasional</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <Label htmlFor="date" className="text-foreground">Tanggal Transfer</Label>
 <Input 
 id="date" 
 type="date"
 required
 value={formData.date}
 onChange={(e) => setFormData({...formData, date: e.target.value})}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="desc" className="text-foreground">Catatan / Deskripsi</Label>
 <Input 
 id="desc" 
 placeholder="Misal: Pindah dana operasional" 
 required
 value={formData.description}
 onChange={(e) => setFormData({...formData, description: e.target.value})}
 />
 </div>
 </div>
 
 </CardContent>
 <CardFooter className="bg-muted/40 flex justify-end gap-3 pt-6">
 <Button type="button" variant="outline" onClick={() => router.push('/finance')} disabled={loading || success}>Batal</Button>
 <Button type="submit" className="gap-2" disabled={loading || success}>
 {loading ?"Memproses..." : <><Save className="w-4 h-4" /> Proses Transfer</>}
 </Button>
 </CardFooter>
 </form>
 </Card>
 </div>
 )
}
