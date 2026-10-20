"use client"

import { useState, useEffect } from"react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { api } from"@/lib/api"
import { formatIDR } from"@/lib/utils"
import { History, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from"lucide-react"

export default function FinanceHistoryPage() {
 const [transactions, setTransactions] = useState<any[]>([])
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setLoading(true)
 const res = await api.get('/finance/transactions')
 setTransactions(res.data)
 } catch (error) {
 console.error(error)
 } finally {
 setLoading(false)
 }
 }

 const getTransactionIcon = (type: string) => {
 if (type === 'Income' || type === 'Cash In') return <ArrowUpRight className="w-4 h-4 text-emerald-500" />
 if (type === 'Expense' || type === 'Cash Out') return <ArrowDownRight className="w-4 h-4 text-rose-500" />
 return <ArrowRightLeft className="w-4 h-4 text-amber-500" />
 }

 const getStatusColor = (status: string) => {
 switch (status.toUpperCase()) {
 case 'COMPLETED': return 'bg-emerald-100 text-primary dark:bg-emerald-900/30 dark:text-primary'
 case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
 case 'CANCELLED': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
 default: return 'bg-muted/50 text-foreground dark:text-muted-foreground'
 }
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2">
 <History className="w-8 h-8 text-primary dark:text-primary" />
 Riwayat Keuangan
 </h1>
 <p className="text-sm text-muted-foreground mt-1">
 Lihat semua rekam jejak arus kas masuk, keluar, maupun mutasi dari berbagai sumber (termasuk POS).
 </p>
 </div>
 </div>

 <Card className="border-0 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50">
 <CardHeader className="border-b border-border/60 bg-muted/20">
 <CardTitle>Daftar Transaksi Kas & Bank</CardTitle>
 <CardDescription>Menampilkan 100 transaksi terakhir</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left">
 <thead className="text-xs text-muted-foreground bg-muted/40 uppercase">
 <tr>
 <th className="px-6 py-4 font-semibold">Tanggal</th>
 <th className="px-6 py-4 font-semibold">No. Transaksi</th>
 <th className="px-6 py-4 font-semibold">Tipe</th>
 <th className="px-6 py-4 font-semibold">Akun Kas</th>
 <th className="px-6 py-4 font-semibold">Keterangan</th>
 <th className="px-6 py-4 font-semibold text-right">Nominal</th>
 <th className="px-6 py-4 font-semibold">Status</th>
 <th className="px-6 py-4 font-semibold">User</th>
 </tr>
 </thead>
 <tbody>
 {loading ? (
 <tr>
 <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
 <div className="flex flex-col items-center justify-center gap-2">
 <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
 <span>Memuat data...</span>
 </div>
 </td>
 </tr>
 ) : transactions.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
 Belum ada riwayat transaksi.
 </td>
 </tr>
 ) : (
 transactions.map((tx) => (
 <tr key={tx.id} className="border-b border-border/60 hover:bg-muted/30 dark:hover:bg-slate-800/50 transition-colors">
 <td className="px-6 py-4 whitespace-nowrap">
 {new Date(tx.transaction_date).toLocaleDateString('id-ID', {
 day: '2-digit', month: 'short', year: 'numeric',
 hour: '2-digit', minute: '2-digit'
 })}
 </td>
 <td className="px-6 py-4 font-medium text-primary dark:text-primary">
 {tx.transaction_no}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 {getTransactionIcon(tx.transaction_type)}
 <span className="font-medium">{tx.transaction_type}</span>
 </div>
 </td>
 <td className="px-6 py-4">
 {tx.cash_account?.name || '-'}
 </td>
 <td className="px-6 py-4 max-w-xs truncate" title={tx.description || '-'}>
 {tx.description || '-'}
 </td>
 <td className={`px-6 py-4 text-right font-bold whitespace-nowrap ${
 (tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In') ? 'text-primary dark:text-primary' : 
 (tx.transaction_type === 'Expense' || tx.transaction_type === 'Cash Out') ? 'text-rose-600 dark:text-rose-400' : ''
 }`}>
 {(tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In') ? '+' : (tx.transaction_type === 'Expense' || tx.transaction_type === 'Cash Out') ? '-' : ''}
 {formatIDR(Number(tx.total_amount))}
 </td>
 <td className="px-6 py-4">
 <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${getStatusColor(tx.status)}`}>
 {tx.status}
 </span>
 </td>
 <td className="px-6 py-4 text-muted-foreground">
 {tx.user_created?.name || '-'}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 </div>
 )
}
