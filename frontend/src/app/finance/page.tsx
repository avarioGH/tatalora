"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { 
 TrendingUp, TrendingDown, DollarSign, 
 CreditCard, Activity, ArrowUpRight, ArrowDownRight, RefreshCcw, AlertTriangle, Plus, Minus
} from"lucide-react"
import { 
 Bar, BarChart, CartesianGrid, 
 ResponsiveContainer, Tooltip, XAxis, YAxis, Legend
} from"recharts"
import { api, FinanceAPI } from"@/lib/api"
import Link from"next/link"

export default function FinanceDashboard() {
 const [loading, setLoading] = useState(true)
 const [isError, setIsError] = useState(false)
 const [summary, setSummary] = useState<any>(null)
 const [transactions, setTransactions] = useState<any[]>([])

 useEffect(() => {
 async function fetchData() {
 try {
 setLoading(true)
 setIsError(false)
 
 // Fetch Summary
 const summaryRes = await FinanceAPI.getSummary()
 setSummary(summaryRes.data)
 
 // Fetch Transactions
 const txRes = await FinanceAPI.getTransactions()
 setTransactions(txRes.data)
 } catch (error) {
 console.error("Database connection failed:", error)
 setIsError(true)
 } finally {
 setLoading(false)
 }
 }
 fetchData()
 }, [])

 // Helper to format currency
 const formatIDR = (value: number) => {
 return new Intl.NumberFormat("id-ID", {
 style:"currency",
 currency:"IDR",
 maximumFractionDigits: 0
 }).format(value || 0)
 }

 // Component to render percentage indicator properly based on real data
 const PercentageIndicator = ({ value, label, invertColors = false }: { value: number | undefined | null, label: string, invertColors?: boolean }) => {
 if (value === undefined || value === null || isNaN(value)) {
 return (
 <div className="flex items-center gap-2 text-sm mt-1">
 <span className="flex items-center gap-1 text-muted-foreground font-medium px-1.5 py-0.5 rounded-md bg-accent">
 <Minus className="w-3 h-3" /> —
 </span>
 <span className="text-muted-foreground text-xs">{label} (Data tidak cukup)</span>
 </div>
 )
 }

 const isPositive = value > 0;
 const isZero = value === 0;
 const isGood = invertColors ? !isPositive : isPositive;
 
 let colorClass ="text-muted-foreground bg-accent";
 let icon = <Minus className="w-3 h-3" />;
 
 if (!isZero) {
 colorClass = isGood ?"text-success bg-success/10" :"text-destructive bg-destructive/10";
 icon = isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />;
 }

 return (
 <div className="flex items-center gap-2 text-sm mt-1">
 <span className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] ${colorClass}`}>
 {icon} {Math.abs(value).toFixed(1)}%
 </span>
 <span className="text-muted-foreground text-xs font-medium">{label}</span>
 </div>
 )
 }

 if (loading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
 <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
 <p className="text-muted-foreground font-medium text-sm">Menghubungkan ke Database Keuangan...</p>
 </div>
 )
 }

 if (isError) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-300">
 <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
 <AlertTriangle className="w-10 h-10 text-destructive" />
 </div>
 <h2 className="text-xl font-bold text-foreground mb-2">Koneksi Database Terputus</h2>
 <p className="text-muted-foreground max-w-md mb-8 text-sm">
 Gagal mengambil data keuangan real. Pastikan backend Anda aktif.
 </p>
 <button 
 onClick={() => window.location.reload()}
 className="bg-primary text-primary-foreground px-5 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm shadow-sm"
 >
 <RefreshCcw className="w-4 h-4" /> Coba Lagi
 </button>
 </div>
 )
 }

 // Use data strictly from DB
 const displayCashFlow = summary?.chartData || [];
 const hasCashflowData = displayCashFlow.length > 0 && displayCashFlow.some((d: any) => d.income > 0 || d.expenses > 0);
 const netProfit = (summary?.totalIncomeMtd || 0) - (summary?.totalExpensesMtd || 0);

 return (
 <div className="space-y-6 animate-in fade-in duration-500 pb-10">
 {/* HEADER */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Keuangan</h1>
 <p className="text-muted-foreground mt-1 text-sm">Pantau arus kas, laba rugi, dan transaksi keuangan perusahaan.</p>
 </div>
 <div className="flex items-center gap-3">
 <Link href="/finance/cash-out" className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 rounded-md border border-destructive/20 transition-colors font-medium text-[13px]">
 <Minus className="w-[14px] h-[14px]" /> Catat Pengeluaran
 </Link>
 <Link href="/finance/cash-in" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors font-medium text-[13px] shadow-sm">
 <Plus className="w-[14px] h-[14px]" /> Catat Pemasukan
 </Link>
 </div>
 </div>

 {/* KPI CARDS */}
 <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
 <Card className="border-border shadow-sm bg-card relative overflow-hidden group hover:border-info/50 transition-colors">
 <div className="absolute top-4 right-4 p-2 bg-info/10 rounded-lg text-info">
 <DollarSign className="w-5 h-5" />
 </div>
 <CardHeader className="pb-2">
 <CardDescription className="font-semibold tracking-wider uppercase text-[10px] text-muted-foreground truncate">Saldo Kas & Bank</CardDescription>
 <CardTitle className="text-2xl font-bold text-foreground truncate mt-1">{formatIDR(summary?.totalCash)}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-2 text-sm mt-1">
 <span className="text-info font-medium text-xs bg-info/10 px-2 py-0.5 rounded flex items-center gap-1"><Activity className="w-3 h-3"/> Liquid</span>
 <span className="text-muted-foreground text-xs">Siap digunakan</span>
 </div>
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm bg-card relative overflow-hidden group hover:border-success/50 transition-colors">
 <div className="absolute top-4 right-4 p-2 bg-success/10 rounded-lg text-success">
 <TrendingUp className="w-5 h-5" />
 </div>
 <CardHeader className="pb-2">
 <CardDescription className="font-semibold tracking-wider uppercase text-[10px] text-muted-foreground truncate">Pemasukan (Bulan Ini)</CardDescription>
 <CardTitle className="text-2xl font-bold text-foreground truncate mt-1">{formatIDR(summary?.totalIncomeMtd)}</CardTitle>
 </CardHeader>
 <CardContent>
 <PercentageIndicator 
 value={summary?.comparison?.incomePercentage} 
 label="vs bulan lalu" 
 />
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm bg-card relative overflow-hidden group hover:border-warning/50 transition-colors">
 <div className="absolute top-4 right-4 p-2 bg-warning/10 rounded-lg text-warning">
 <TrendingDown className="w-5 h-5" />
 </div>
 <CardHeader className="pb-2">
 <CardDescription className="font-semibold tracking-wider uppercase text-[10px] text-muted-foreground truncate">Pengeluaran (Bulan Ini)</CardDescription>
 <CardTitle className="text-2xl font-bold text-foreground truncate mt-1">{formatIDR(summary?.totalExpensesMtd)}</CardTitle>
 </CardHeader>
 <CardContent>
 <PercentageIndicator 
 value={summary?.comparison?.expensePercentage} 
 label="vs bulan lalu" 
 invertColors={true}
 />
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm bg-card relative overflow-hidden group hover:border-primary/50 transition-colors">
 <div className="absolute top-4 right-4 p-2 bg-primary/10 rounded-lg text-primary">
 <CreditCard className="w-5 h-5" />
 </div>
 <CardHeader className="pb-2">
 <CardDescription className="font-semibold tracking-wider uppercase text-[10px] text-muted-foreground truncate">Laba Bersih (Bulan Ini)</CardDescription>
 <CardTitle className="text-2xl font-bold text-foreground truncate mt-1">{formatIDR(netProfit)}</CardTitle>
 </CardHeader>
 <CardContent>
 <PercentageIndicator 
 value={summary?.comparison?.profitPercentage} 
 label="vs bulan lalu" 
 />
 </CardContent>
 </Card>
 </div>

 {/* CHARTS & TRANSACTIONS */}
 <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
 <Card className="lg:col-span-2 border-border shadow-sm flex flex-col">
 <CardHeader className="pb-4 border-b border-border/50">
 <CardTitle className="text-base font-bold">Arus Kas (Pemasukan vs Pengeluaran)</CardTitle>
 <CardDescription className="text-xs">Perbandingan cash-in dan cash-out bulan ini</CardDescription>
 </CardHeader>
 <CardContent className="flex-1 flex flex-col justify-center">
 {!hasCashflowData ? (
 <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
 <Activity className="w-8 h-8 mb-3 opacity-20" />
 <p className="text-sm font-medium">Belum ada transaksi arus kas</p>
 </div>
 ) : (
 <div className="h-[300px] mt-6 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={displayCashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={16}>
 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" dy={10} />
 <YAxis 
 axisLine={false} 
 tickLine={false} 
 tick={{ fontSize: 11, fill: 'currentColor' }}
 className="text-muted-foreground"
 tickFormatter={(value) => `Rp${value / 1000000}M`}
 dx={-10}
 />
 <CartesianGrid vertical={false} stroke="currentColor" className="stroke-border/50" strokeDasharray="4 4" />
 <Tooltip 
 contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
 formatter={(value: any) => [formatIDR(value as number), undefined]}
 cursor={{fill: 'var(--accent)'}}
 itemStyle={{ fontSize: '13px', fontWeight: 500 }}
 labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '4px', fontSize: '12px' }}
 />
 <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
 <Bar dataKey="income" name="Pemasukan" fill="var(--success)" radius={[3, 3, 0, 0]} />
 <Bar dataKey="expenses" name="Pengeluaran" fill="var(--destructive)" radius={[3, 3, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm flex flex-col">
 <CardHeader className="pb-4 border-b border-border/50">
 <CardTitle className="text-base font-bold">Transaksi Terakhir</CardTitle>
 <CardDescription className="text-xs">Aktivitas keuangan terbaru</CardDescription>
 </CardHeader>
 <CardContent className="p-0 flex-1">
 <div className="divide-y divide-border/50">
 {(!transactions || transactions.length === 0) ? (
 <div className="text-center text-muted-foreground py-10 flex flex-col items-center">
 <CreditCard className="w-6 h-6 opacity-20 mb-2" />
 <p className="text-xs font-medium">Belum ada transaksi bulan ini.</p>
 </div>
 ) : (
 transactions.slice(0, 7).map((tx, i) => {
 const isIncome = tx.transaction_type === 'Income' || tx.transaction_type === 'Cash In';
 return (
 <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 px-4 py-3 hover:bg-accent/50 transition-colors">
 <div className="flex items-center gap-3">
 <div className={`p-1.5 rounded-md ${isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
 {isIncome ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
 </div>
 <div>
 <p className="font-semibold text-[13px] text-foreground">{tx.description || tx.transaction_no}</p>
 <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{new Date(tx.transaction_date).toLocaleDateString('id-ID')}</p>
 </div>
 </div>
 <div className={`font-bold text-[13px] ${isIncome ? 'text-success' : 'text-foreground'}`}>
 {isIncome ? '+' : '-'}{formatIDR(tx.total_amount)}
 </div>
 </div>
 )})
 )}
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 )
}
