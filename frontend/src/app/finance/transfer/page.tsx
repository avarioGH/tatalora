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
import { ArrowLeft, Save, Repeat, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import Link from "next/link"

export default function FinanceTransfer() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchingAccounts, setFetchingAccounts] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [accounts, setAccounts] = useState<any[]>([])

  const [formData, setFormData] = useState({
    amount: "",
    fromAccount: "",
    toAccount: "",
    description: "",
    date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  })

  useEffect(() => {
    async function loadAccounts() {
      try {
        setFetchingAccounts(true)
        const res = await api.get('/finance/payments/cash-accounts').catch(() => ({ data: [] }))
        const list = res.data?.data || res.data || []
        setAccounts(list)
        if (list.length >= 2) {
          setFormData(prev => ({
            ...prev,
            fromAccount: list[0].id,
            toAccount: list[1].id
          }))
        } else if (list.length === 1) {
          setFormData(prev => ({ ...prev, fromAccount: list[0].id }))
        }
      } catch (e) {
        console.error("Error loading accounts:", e)
      } finally {
        setFetchingAccounts(false)
      }
    }
    loadAccounts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fromAccount || !formData.toAccount) {
      setError("Pilih rekening sumber dan tujuan.")
      return
    }
    if (formData.fromAccount === formData.toAccount) {
      setError("Rekening sumber dan tujuan tidak boleh sama.")
      return
    }
    if (Number(formData.amount) <= 0) {
      setError("Nominal transfer harus lebih besar dari 0.")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      await api.post('/finance/transfer', {
        fromAccountId: formData.fromAccount,
        toAccountId: formData.toAccount,
        amount: Number(formData.amount),
        date: formData.date,
        description: formData.description
      })
      setSuccess(true)
      setTimeout(() => {
        router.push('/finance/cash')
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || "Gagal melakukan transfer dana.")
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transfer Kas & Bank</h1>
          <p className="text-sm text-muted-foreground mt-1">Pindahkan dana antar rekening kas/bank perusahaan dengan pencatatan jurnal otomatis.</p>
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <div className="h-2 w-full bg-indigo-600"></div>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-indigo-600" /> Detail Transfer Saldo
            </CardTitle>
            <CardDescription>Masukkan rincian nominal dan mutasi antar kas/bank Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {success && (
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold text-sm">Transfer saldo berhasil diproses & jurnal dicatat! Mengalihkan ke mutasi kas...</p>
              </div>
            )}
            
            {error && (
              <div className="bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-foreground font-semibold">Nominal Transfer (Rp)</Label>
              <Input 
                id="amount" 
                type="number"
                placeholder="Misal: 1000000" 
                className="text-lg font-bold bg-background text-indigo-600"
                required
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Dari Rekening (Sumber Dana)</Label>
                <Select value={formData.fromAccount} onValueChange={(val) => setFormData({...formData, fromAccount: val || ""})}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={fetchingAccounts ? "Memuat akun..." : "Pilih Rekening Sumber"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_code || "Kas/Bank"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Ke Rekening (Tujuan Transfer)</Label>
                <Select value={formData.toAccount} onValueChange={(val) => setFormData({...formData, toAccount: val || ""})}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={fetchingAccounts ? "Memuat akun..." : "Pilih Rekening Tujuan"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.account_code || "Kas/Bank"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-foreground font-semibold">Tanggal Transfer</Label>
                <Input 
                  id="date" 
                  type="date"
                  className="bg-background"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-foreground font-semibold">Keterangan / Berita Transfer</Label>
                <Input 
                  id="desc" 
                  placeholder="Misal: Tarik tunai ke kas toko, setor modal..." 
                  className="bg-background"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border pt-6">
            <Link href="/finance">
              <Button variant="outline" type="button">Batal</Button>
            </Link>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Proses Transfer Dana
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
