"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, Trash2, ArrowLeft, Save, FileText, Wallet, Loader2
} from "lucide-react"
import { api } from "@/lib/api"

export default function CreateExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Master Data
  const [cashAccounts, setCashAccounts] = useState<any[]>([])
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([])
  const [liabilityAccounts, setLiabilityAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Form State
  const [fromAccountId, setFromAccountId] = useState("")
  const [payee, setPayee] = useState("")
  const [transactionDate, setTransactionDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })
  )
  const [reference, setReference] = useState("")
  const [memo, setMemo] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [paymentMode, setPaymentMode] = useState<"NOW" | "LATER">("NOW")
  const [dueDate, setDueDate] = useState("")

  // Line items
  const [items, setItems] = useState([
    { id: 1, accountId: "", desc: "", amount: 0 }
  ])

  useEffect(() => {
    async function fetchMaster() {
      setLoading(true)
      try {
        const [accRes, coaRes, catRes] = await Promise.all([
          api.get("/finance/accounts").catch(() => api.get("/finance/payments/cash-accounts")).catch(() => ({ data: [] })),
          api.get("/gl/accounts").catch(() => ({ data: [] })),
          api.get("/finance/categories").catch(() => ({ data: [] }))
        ])

        const accList = accRes.data?.data || accRes.data || []
        const coaList = coaRes.data || []
        const catList = catRes.data || []

        setCashAccounts(accList)
        if (accList.length > 0) setFromAccountId(accList[0].id)

        // Filter Expense accounts (type Expense or code starting with 5, 6, 8, 9)
        const expList = coaList.filter((a: any) => 
          a.account_type?.category === 'Expense' || 
          a.account_type?.name?.toLowerCase().includes('expense') ||
          a.account_type?.name?.toLowerCase().includes('beban') ||
          a.account_type?.name?.toLowerCase().includes('biaya') ||
          a.account_name?.toLowerCase().includes('beban') ||
          a.account_name?.toLowerCase().includes('biaya') ||
          a.account_code?.startsWith('5') ||
          a.account_code?.startsWith('6') ||
          a.account_code?.startsWith('8') ||
          a.account_code?.startsWith('9')
        )
        setExpenseAccounts(expList.length > 0 ? expList : coaList)
        setCategories(catList)
      } catch (e) {
        console.error("Error fetching master data:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMaster()
  }, [])

  const addRow = () => {
    setItems([...items, { id: Date.now(), accountId: "", desc: "", amount: 0 }])
  }

  const removeRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (paymentMode === "NOW" && !fromAccountId) return alert("Pilih akun kas/bank pembayar!")
    if (paymentMode === "LATER" && !dueDate) return alert("Pilih tanggal jatuh tempo untuk biaya terutang!")
    if (totalAmount <= 0) return alert("Total nominal biaya harus lebih dari 0!")

    setSubmitting(true)
    try {
      const firstDebitAccount = items[0]?.accountId || (expenseAccounts[0]?.id)
      const primaryAccount = cashAccounts.find(a => a.id === fromAccountId)

      await api.post("/finance/cash-out", {
        cashAccountId: fromAccountId,
        amount: totalAmount,
        transactionDate,
        description: memo || (items[0]?.desc ? `${payee ? payee + ' - ' : ''}${items[0]?.desc}` : `Biaya Operasional ${payee || ''}`),
        categoryId: categoryId || undefined,
        debitAccountId: firstDebitAccount,
        creditAccountId: primaryAccount?.chart_of_account_id || undefined,
        transactionNo: reference || `EXP-${Date.now()}`
      })

      alert("Transaksi biaya operasional berhasil dicatat!")
      router.push("/finance/expenses")
    } catch (err: any) {
      console.error(err)
      alert("Gagal mencatat biaya: " + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-background min-h-screen">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-2 cursor-pointer hover:text-foreground transition-colors w-fit" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Kembali</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Wallet className="h-6 w-6 text-violet-600" />
            </div>
            Tambah Biaya Operasional
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (Main Form) */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Informasi Transaksi Biaya
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Label className="text-foreground font-semibold">
                        {paymentMode === "NOW" ? "Dibayar Dari Rekening" : "Alokasi Akun Utang Beban"} <span className="text-rose-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2 text-xs">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="paymode" checked={paymentMode === "NOW"} onChange={() => setPaymentMode("NOW")} />
                          Bayar Sekarang
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer text-amber-700 dark:text-amber-400 font-semibold">
                          <input type="radio" name="paymode" checked={paymentMode === "LATER"} onChange={() => setPaymentMode("LATER")} />
                          Biaya Terutang (Bayar Nanti)
                        </label>
                      </div>
                    </div>
                    {cashAccounts.length === 0 && !loading && (
                      <Link href="/finance/cash" className="text-xs text-blue-600 hover:underline">
                        + Tambah Kas/Bank
                      </Link>
                    )}
                  </div>
                  {paymentMode === "NOW" ? (
                    cashAccounts.length === 0 && !loading ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                        Belum ada akun Kas/Bank yang dikonfigurasi. Silakan setup akun kas di <Link href="/finance/cash" className="font-semibold underline">Kas & Bank</Link> terlebih dahulu, atau pilih opsi <b>Biaya Terutang (Bayar Nanti)</b> di atas.
                      </div>
                    ) : (
                      <Select value={fromAccountId} onValueChange={(val) => setFromAccountId(val || "")}>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder={loading ? "Memuat akun..." : "Pilih Kas/Bank"} />
                        </SelectTrigger>
                        <SelectContent>
                          {cashAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.account_code || "Kas/Bank"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  ) : (
                    <div className="space-y-3">
                      <Select value={fromAccountId} onValueChange={(val) => setFromAccountId(val || "")}>
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder={loading ? "Memuat akun..." : "Pilih Akun Utang (2-xxxxx)"} />
                        </SelectTrigger>
                        <SelectContent>
                          {liabilityAccounts.length > 0 ? liabilityAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.account_code} - {acc.account_name}
                            </SelectItem>
                          )) : (
                            <SelectItem value="default_ap">2-20100 - Hutang Usaha / Biaya Masih Harus Dibayar</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Penerima / Vendor / Payee</Label>
                  <Input 
                    placeholder="Contoh: PLN, Telkom, Sewa Gedung, dll"
                    value={payee}
                    onChange={(e) => setPayee(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Tgl. Transaksi <span className="text-rose-500">*</span></Label>
                  <Input 
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="bg-muted border-border"
                    required
                  />
                </div>
                {paymentMode === "LATER" && (
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold text-amber-700 dark:text-amber-400">Tgl. Jatuh Tempo <span className="text-rose-500">*</span></Label>
                    <Input 
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-muted border-border border-amber-300"
                      required={paymentMode === "LATER"}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-foreground font-semibold">Nomor Referensi / Bukti</Label>
                  <Input 
                    placeholder="No kwitansi / struk / invoice"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Catatan / Keterangan Umum</Label>
                <Textarea 
                  placeholder="Catatan tambahan untuk transaksi pengeluaran ini..."
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={2}
                  className="bg-muted border-border resize-none text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border-0 shadow-sm ring-1 ring-border overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-foreground">Rincian Akun Beban (COA)</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="text-violet-600 border-violet-200">
                <Plus className="w-4 h-4 mr-1" /> Tambah Baris
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50 border-y border-border">
                  <TableRow>
                    <TableHead className="w-[45%] text-foreground font-semibold">Akun Beban</TableHead>
                    <TableHead className="w-[30%] text-foreground font-semibold">Deskripsi</TableHead>
                    <TableHead className="w-[20%] text-right text-foreground font-semibold">Jumlah (Rp)</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="p-3">
                        <Select 
                          value={item.accountId} 
                          onValueChange={(val) => handleItemChange(index, "accountId", val)}
                        >
                          <SelectTrigger className="bg-background border-border text-xs">
                            <SelectValue placeholder="Pilih Akun Beban" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {expenseAccounts.map(coa => (
                              <SelectItem key={coa.id} value={coa.id}>
                                {coa.account_code} - {coa.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-3">
                        <Input 
                          placeholder="Keterangan baris..."
                          value={item.desc}
                          onChange={(e) => handleItemChange(index, "desc", e.target.value)}
                          className="bg-background border-border text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-3 text-right">
                        <Input 
                          type="number"
                          placeholder="0"
                          value={item.amount || ""}
                          onChange={(e) => handleItemChange(index, "amount", Number(e.target.value))}
                          className="bg-background border-border text-right font-bold text-violet-600 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={items.length === 1}
                          onClick={() => removeRow(item.id)}
                          className="text-rose-500 hover:text-rose-700 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Summary) */}
        <div className="xl:col-span-1">
          <Card className="border-0 shadow-sm ring-1 ring-border sticky top-6 bg-card">
            <CardHeader className="bg-muted/30 rounded-t-xl pb-4 border-b border-border">
              <CardTitle className="text-lg text-foreground">Ringkasan Biaya</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Transaksi</span>
                <span className="text-xl font-bold text-violet-600">{formatIDR(totalAmount)}</span>
              </div>

              <div className="pt-6 space-y-3">
                {paymentMode === "NOW" && cashAccounts.length === 0 ? (
                  <Link 
                    href="/finance/cash"
                    className="w-full inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg transition-all py-3.5 px-4 text-base font-semibold gap-2"
                  >
                    <Wallet className="w-4 h-4" /> Setup Kas & Bank Dahulu
                  </Link>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={submitting} 
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all py-6 text-base font-semibold gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Simpan Biaya Operasional
                      </>
                    )}
                  </Button>
                )}
                {(paymentMode === "NOW" && cashAccounts.length === 0) && (
                  <p className="text-xs text-center text-muted-foreground">
                    Belum ada rekening Kas/Bank sumber. Klik tombol di atas untuk membuka setup Kas & Bank, atau pilih opsi <b>'Biaya Terutang (Bayar Nanti)'</b>.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
