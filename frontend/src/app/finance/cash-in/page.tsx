"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Plus, AlertCircle, CheckCircle2, Wallet, UserCheck, Calendar, FileText } from "lucide-react"
import { api, FinanceAPI } from "@/lib/api"
import Link from "next/link"

export default function FinanceCashIn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [categories, setCategories] = useState<any[]>([])
  const [cashAccounts, setCashAccounts] = useState<any[]>([])

  const [formData, setFormData] = useState({
    amount: "",
    cashAccountId: "",
    payer: "",
    categoryId: "",
    transactionNo: `CR-${Date.now().toString().slice(-6)}`,
    description: "",
    memo: "",
    date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [catData, accData] = await Promise.all([
          FinanceAPI.getCategories().catch(() => []),
          FinanceAPI.getCashAccounts().catch(() => [])
        ])

        const filteredCats = (Array.isArray(catData) ? catData : []).filter((c: any) => c.type === "INCOME")
        setCategories(filteredCats)
        
        const accounts = Array.isArray(accData?.data) ? accData.data : (Array.isArray(accData) ? accData : [])
        setCashAccounts(accounts)
        
        if (accounts.length > 0) {
          setFormData(prev => ({
            ...prev,
            cashAccountId: accounts[0].id
          }))
        }
      } catch (err) {
        console.error("Failed to load initial data:", err)
      }
    }
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const numAmount = Number(formData.amount.replace(/[^0-9.-]+/g, ""))
      if (numAmount <= 0) {
        setError("Jumlah uang harus lebih besar dari 0")
        setLoading(false)
        return
      }

      const fullDescription = [
        formData.payer ? `Dari: ${formData.payer}` : "",
        formData.description,
        formData.memo ? `(Memo: ${formData.memo})` : ""
      ].filter(Boolean).join(" - ")

      const payload = {
        amount: numAmount,
        cashAccountId: formData.cashAccountId || undefined,
        categoryId: formData.categoryId || undefined,
        transactionNo: formData.transactionNo || undefined,
        description: fullDescription || "Pemasukan Kas",
        transactionDate: formData.date
      }

      await api.post('/finance/cash-in', payload)
      setSuccess(true)
      setTimeout(() => {
        router.push('/finance/cash')
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err?.response?.data?.message || "Gagal menyimpan transaksi penerimaan uang.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/finance/cash">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Terima Uang (Cash In)</h1>
          <p className="text-sm text-muted-foreground mt-1">Catat penerimaan kas atau bank masuk ke dalam pembukuan.</p>
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-emerald-500"></div>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Plus className="w-5 h-5 text-emerald-500" /> Formulir Penerimaan Dana
            </CardTitle>
            <CardDescription>Sesuaikan detail akun penerima kas/bank, tanggal, dan pengirim uang.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {success && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-4 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="font-medium text-sm">Penerimaan uang berhasil dicatat! Mengalihkan ke Mutasi Kas...</p>
              </div>
            )}
            
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-lg border border-border/60">
              <div className="space-y-2">
                <Label htmlFor="cashAccount" className="text-foreground font-semibold flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Setor Ke Akun (Kas & Bank) *
                </Label>
                <Select 
                  value={formData.cashAccountId} 
                  onValueChange={(val) => setFormData({...formData, cashAccountId: val || ""})}
                >
                  <SelectTrigger id="cashAccount" className="bg-background">
                    <SelectValue placeholder="Pilih Akun Kas / Bank Penerima" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_type}) - Saldo: Rp {Number(acc.current_balance || 0).toLocaleString('id-ID')}
                      </SelectItem>
                    ))}
                    {cashAccounts.length === 0 && (
                      <SelectItem value="none" disabled>Belum ada akun kas</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Akun kas/bank yang saldo-nya akan bertambah.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payer" className="text-foreground font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Yang Membayar (Customer / Kontak)
                </Label>
                <Input 
                  id="payer" 
                  placeholder="Nama pembayar / pelanggan..." 
                  className="bg-background"
                  value={formData.payer}
                  onChange={(e) => setFormData({...formData, payer: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">Nama pihak yang menyetor atau mentransfer uang.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-foreground font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" /> Tanggal Transaksi *
                </Label>
                <Input 
                  id="date" 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="txNo" className="text-foreground font-semibold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-muted-foreground" /> No Transaksi
                </Label>
                <Input 
                  id="txNo" 
                  value={formData.transactionNo}
                  onChange={(e) => setFormData({...formData, transactionNo: e.target.value})}
                  placeholder="Auto-generated"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground font-semibold">Kategori Penerimaan</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(val) => setFormData({...formData, categoryId: val || ""})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Pilih Kategori (Opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c, idx) => (
                      <SelectItem key={c?.id || idx} value={c?.id || `cat-${idx}`}>
                        {c?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-foreground font-semibold text-base">
                Jumlah Uang Diterima (Rp) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-muted-foreground">Rp</span>
                <Input 
                  id="amount" 
                  type="number"
                  placeholder="0" 
                  className="text-xl font-bold pl-12 h-12 border-emerald-500/40 focus-visible:ring-emerald-500"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-foreground font-semibold">Deskripsi / Uraian *</Label>
                <Input 
                  id="desc" 
                  placeholder="Misal: Pembayaran pelunasan proyek / setoran modal" 
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo" className="text-foreground font-semibold">Catatan / Memo</Label>
                <Input 
                  id="memo" 
                  placeholder="Catatan internal opsional..." 
                  value={formData.memo}
                  onChange={(e) => setFormData({...formData, memo: e.target.value})}
                />
              </div>
            </div>
            
          </CardContent>
          <CardFooter className="bg-muted/40 flex justify-end gap-3 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => router.push('/finance/cash')} disabled={loading || success}>
              Batal
            </Button>
            <Button type="submit" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading || success}>
              {loading ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan Penerimaan</>}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
