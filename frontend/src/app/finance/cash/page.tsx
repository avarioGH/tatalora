"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FinanceAPI } from "@/lib/api"
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Search, 
  Download, 
  Plus, 
  Minus, 
  Repeat, 
  Wallet, 
  Building2, 
  CreditCard, 
  CircleDollarSign,
  Filter,
  RefreshCw,
  Eye
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function MutasiKasPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAccount, setSelectedAccount] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // New Account Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [accountError, setAccountError] = useState("")
  const [newAccount, setNewAccount] = useState({
    name: "",
    code: "",
    account_type: "Bank",
    opening_balance: ""
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [txRes, accRes, sumRes] = await Promise.all([
        FinanceAPI.getTransactions({
          cashAccountId: selectedAccount !== "all" ? selectedAccount : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: searchTerm || undefined,
        }).catch(() => ({ data: [] })),
        FinanceAPI.getCashAccounts().catch(() => []),
        FinanceAPI.getSummary().catch(() => null)
      ])

      const txList = Array.isArray(txRes?.data) ? txRes.data : (Array.isArray(txRes) ? txRes : [])
      setTransactions(txList)

      const accList = Array.isArray(accRes?.data) ? accRes.data : (Array.isArray(accRes) ? accRes : [])
      setAccounts(accList)

      setSummary(sumRes)
    } catch (error) {
      console.error("Gagal mengambil data buku kas:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedAccount, startDate, endDate])

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingAccount(true)
    setAccountError("")

    try {
      if (!newAccount.name || !newAccount.code) {
        setAccountError("Nama dan kode akun wajib diisi")
        setCreatingAccount(false)
        return
      }

      await FinanceAPI.createCashAccount({
        name: newAccount.name,
        code: newAccount.code,
        account_type: newAccount.account_type,
        opening_balance: Number(newAccount.opening_balance || 0)
      })

      setIsDialogOpen(false)
      setNewAccount({
        name: "",
        code: "",
        account_type: "Bank",
        opening_balance: ""
      })
      await fetchData()
    } catch (err: any) {
      console.error(err)
      setAccountError(err?.response?.data?.message || "Gagal membuat akun kas/bank")
    } finally {
      setCreatingAccount(false)
    }
  }

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  const filteredData = transactions.filter(tx => {
    // Client-side text filter fallback
    const matchesSearch = !searchTerm || 
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tx.transaction_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.cash_account?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const isIncome = tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In' || tx.transaction_type === 'Transfer In'
    const matchesType = 
      selectedType === "all" ||
      (selectedType === "in" && isIncome) ||
      (selectedType === "out" && !isIncome)

    return matchesSearch && matchesType
  })

  // Calculate totals
  const totalBalanceAll = accounts.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0)
  const totalIn = filteredData
    .filter(tx => tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In' || tx.transaction_type === 'Transfer In')
    .reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0)
  const totalOut = filteredData
    .filter(tx => !(tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In' || tx.transaction_type === 'Transfer In'))
    .reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0)

  const handleExportCSV = () => {
    const headers = ["Tanggal", "No Transaksi", "Akun Kas/Bank", "Deskripsi", "Tipe", "Uang Masuk (IDR)", "Uang Keluar (IDR)"]
    const rows = filteredData.map(tx => {
      const isIncome = tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In' || tx.transaction_type === 'Transfer In'
      return [
        new Date(tx.transaction_date).toLocaleDateString('id-ID'),
        `"${tx.transaction_no || ''}"`,
        `"${tx.cash_account?.name || '-'}"`,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        tx.transaction_type,
        isIncome ? tx.total_amount : 0,
        !isIncome ? tx.total_amount : 0
      ]
    })
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Buku_Kas_Tatalora_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Top Header & Mekari Jurnal Quick Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card border border-border p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Buku Kas (Kas & Bank)</h1>
            <span className="text-xs bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-full">
              Live & Real-time
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Pantau saldo seluruh rekening kas, bank, dan mutasi arus dana perusahaan.
          </p>
        </div>

        {/* Action Buttons: Jurnal Style */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Link href="/finance/cash-in">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shadow-sm text-sm">
              <Plus className="w-4 h-4" /> Terima Uang
            </Button>
          </Link>
          <Link href="/finance/cash-out">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-medium gap-1.5 shadow-sm text-sm">
              <Minus className="w-4 h-4" /> Kirim Uang
            </Button>
          </Link>
          <Link href="/finance/transfer">
            <Button variant="outline" className="border-indigo-500/30 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-medium gap-1.5 text-sm">
              <Repeat className="w-4 h-4" /> Transfer Uang
            </Button>
          </Link>

          {/* Dialog Tambah Akun Baru */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button variant="secondary" className="gap-1.5 text-sm" type="button">
                <Building2 className="w-4 h-4" /> Tambah Akun
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateAccount}>
                <DialogHeader>
                  <DialogTitle>Buat Akun Kas & Bank Baru</DialogTitle>
                  <DialogDescription>
                    Tambahkan rekening kas kecil, rekening bank, atau dompet digital perusahaan.
                  </DialogDescription>
                </DialogHeader>

                {accountError && (
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-md text-xs mt-3">
                    {accountError}
                  </div>
                )}

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="acc-name">Nama Akun *</Label>
                    <Input 
                      id="acc-name" 
                      placeholder="Misal: Bank Mandiri Operasional / Kasir POS" 
                      required
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acc-code">Kode Akun *</Label>
                      <Input 
                        id="acc-code" 
                        placeholder="Misal: BANK-02 / KAS-05" 
                        required
                        value={newAccount.code}
                        onChange={(e) => setNewAccount({...newAccount, code: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acc-type">Kategori</Label>
                      <Select 
                        value={newAccount.account_type} 
                        onValueChange={(val) => setNewAccount({...newAccount, account_type: val || "Bank"})}
                      >
                        <SelectTrigger id="acc-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="Cash">Kas Tunai</SelectItem>
                          <SelectItem value="Petty Cash">Kas Kecil (Petty Cash)</SelectItem>
                          <SelectItem value="Digital Wallet">Dompet Digital</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc-balance">Saldo Awal (Rp)</Label>
                    <Input 
                      id="acc-balance" 
                      type="number" 
                      placeholder="0" 
                      value={newAccount.opening_balance}
                      onChange={(e) => setNewAccount({...newAccount, opening_balance: e.target.value})}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={creatingAccount}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={creatingAccount}>
                    {creatingAccount ? "Menyimpan..." : "Simpan Akun"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Account Balance Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Ringkasan Saldo Akun</h2>
            <span className="text-xs text-muted-foreground">({accounts.length} Akun Terdaftar)</span>
          </div>
          <div className="text-sm font-semibold text-foreground">
            Total Kas & Bank: <span className="text-primary font-bold">{formatIDR(totalBalanceAll)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card All Accounts */}
          <div 
            onClick={() => setSelectedAccount("all")}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedAccount === "all" 
                ? "bg-primary/10 border-primary shadow-sm" 
                : "bg-card border-border hover:border-primary/40 hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Semua Akun</span>
              <CircleDollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xl font-bold text-foreground mt-2">
              {formatIDR(totalBalanceAll)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gabungan seluruh saldo</p>
          </div>

          {/* Cards per Account */}
          {accounts.map((acc) => {
            const isSelected = selectedAccount === acc.id
            const isBank = acc.account_type === 'Bank'
            return (
              <div 
                key={acc.id}
                onClick={() => setSelectedAccount(acc.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected 
                    ? "bg-primary/10 border-primary shadow-sm" 
                    : "bg-card border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {acc.code}
                  </span>
                  {isBank ? (
                    <Building2 className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Wallet className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <div className="font-semibold text-foreground text-sm mt-2 truncate" title={acc.name}>
                  {acc.name}
                </div>
                <div className="text-lg font-bold text-foreground mt-1">
                  {formatIDR(acc.current_balance)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                  <span>{acc.account_type}</span>
                  {isSelected && <span className="text-primary font-medium">Aktif</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Transactions Hub */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-xl">Mutasi & Riwayat Transaksi</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {selectedAccount === "all" 
                  ? "Menampilkan transaksi dari semua akun kas & bank" 
                  : `Menampilkan mutasi untuk ${accounts.find(a => a.id === selectedAccount)?.name || 'akun terpilih'}`}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 h-9 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 h-9 text-xs">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-border mt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari deskripsi, no tx, akun..."
                className="pl-8 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <Select value={selectedAccount} onValueChange={(val) => setSelectedAccount(val || "all")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Filter Akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Rekening Kas & Bank</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={selectedType} onValueChange={(val) => setSelectedType(val || "all")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Tipe Mutasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe Transaksi</SelectItem>
                  <SelectItem value="in">Hanya Uang Masuk (In)</SelectItem>
                  <SelectItem value="out">Hanya Uang Keluar (Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="h-9 text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Tanggal Mulai"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="date"
                className="h-9 text-xs"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Tanggal Selesai"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/40 rounded-lg border border-border mb-4 text-center">
            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total Masuk</span>
              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base mt-0.5">{formatIDR(totalIn)}</p>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total Keluar</span>
              <p className="text-rose-600 dark:text-rose-400 font-bold text-base mt-0.5">{formatIDR(totalOut)}</p>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Arus Bersih (Net)</span>
              <p className={`font-bold text-base mt-0.5 ${totalIn - totalOut >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatIDR(totalIn - totalOut)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">No. Transaksi</th>
                  <th className="px-4 py-3 font-semibold">Akun Kas / Bank</th>
                  <th className="px-4 py-3 font-semibold">Deskripsi / Kontak</th>
                  <th className="px-4 py-3 font-semibold text-center">Tipe</th>
                  <th className="px-4 py-3 font-semibold text-right">Masuk (In)</th>
                  <th className="px-4 py-3 font-semibold text-right">Keluar (Out)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Memuat data transaksi kas & bank...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Tidak ada mutasi kas sesuai filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((tx, idx) => {
                    const isIncome = tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In' || tx.transaction_type === 'Transfer In'
                    const isTransfer = tx.transaction_type?.includes('Transfer')
                    return (
                      <tr key={tx.id || idx} className="bg-card hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-foreground">
                          {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium text-primary text-xs">
                          {tx.transaction_no || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground font-medium">
                          {tx.cash_account?.name ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                              {tx.cash_account.name}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-xs truncate" title={tx.description}>
                          {tx.description || '-'}
                          {tx.user_created?.name && (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              Oleh: {tx.user_created.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isTransfer
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                              : isIncome 
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                          {isIncome ? formatIDR(tx.total_amount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600 dark:text-rose-400 text-xs">
                          {!isIncome ? formatIDR(tx.total_amount) : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
