"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { ArrowLeft, Sparkles, TrendingDown, Activity, RefreshCw, AlertCircle } from"lucide-react"
import { api, FinanceAPI } from"@/lib/api"
import { formatIDR } from"@/lib/utils"
import Link from"next/link"

export default function AIFinanceAnalysisPage() {
 const [loading, setLoading] = useState(true)
 const [analyzing, setAnalyzing] = useState(false)
 
 const [insights, setInsights] = useState<any[]>([])
 const [burnRate, setBurnRate] = useState(0)
 const [runway, setRunway] = useState(0)

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setLoading(true)
 const [txRes, accRes] = await Promise.all([
 FinanceAPI.getTransactions().catch(() => []),
 FinanceAPI.getSummary().catch(() => ({ cashInHand: 0, cashInBank: 0 }))
 ])
 
 const totalBalance = (accRes.cashInHand || 0) + (accRes.cashInBank || 0);
 runAIAnalysis(txRes, totalBalance || 0)

 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const runAIAnalysis = async (transactions: any[], currentBalance: number) => {
 setAnalyzing(true)
 
 try {
 let totalExpense = 0
 let totalIncome = 0
 
 transactions.forEach(t => {
 if (t.transaction_type === 'Expense' || t.transaction_type === 'Cash Out') {
 totalExpense += Number(t.total_amount || 0)
 } else if (t.transaction_type === 'Income' || t.transaction_type === 'Cash In') {
 totalIncome += Number(t.total_amount || 0)
 }
 })

 const contextData = {
 totalExpense,
 totalIncome,
 currentBalance,
 transactionsCount: transactions.length,
 // Send a limited summary so we don't exceed prompt limits easily
 recentTransactions: transactions.slice(0, 50).map(t => ({
 type: t.transaction_type,
 amount: Number(t.total_amount),
 date: t.transaction_date,
 desc: t.description
 }))
 }

 const prompt = `Tolong analisis data keuangan berikut dan berikan: 1. estimasi burn rate bulanan (angka), 2. estimasi runway (angka bulan), 3. insights (minimal 2, dengan type: 'CRITICAL', 'GOOD', atau 'WARNING', title, desc, dan recommendation). Format jawaban HARUS HANYA JSON murni tanpa markdown block. Struktur JSON yang benar: {"burnRate": number,"runway": number,"insights": [{"type":"string","title":"string","desc":"string","recommendation":"string"}]}`

 const res = await api.post('/platform/ai/ask', {
 prompt,
 contextData
 })

 let responseText = res.data
 // Clean markdown code blocks if any
 if (typeof responseText === 'string') {
 responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()
 } else if (responseText && responseText.text) {
 responseText = responseText.text.replace(/```json/gi, '').replace(/```/g, '').trim()
 }
 
 const parsed = typeof responseText === 'string' ? JSON.parse(responseText) : responseText
 
 setBurnRate(parsed.burnRate || 0)
 setRunway(parsed.runway || 0)
 setInsights(parsed.insights || [])

 } catch (e) {
 console.error("AI Analysis failed", e)
 // Fallback
 setBurnRate(0)
 setRunway(0)
 setInsights([{
 type: 'CRITICAL',
 title: 'Analisis Gagal',
 desc: 'Gagal menghubungi server AI.',
 recommendation: 'Cek koneksi internet atau ketersediaan API Gemini.'
 }])
 } finally {
 setAnalyzing(false)
 }
 }

 if (loading) {
 return <div className="py-20 text-center text-muted-foreground">Membaca buku besar keuangan...</div>
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <Link href="/">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2">
 Analisis Keuangan AI <Sparkles className="w-6 h-6 text-teal-500" />
 </h1>
 <p className="text-[14px] text-muted-foreground mt-1">Diagnosis otomatis terhadap kesehatan finansial perusahaan Anda.</p>
 </div>
 </div>
 <Button onClick={fetchData} disabled={analyzing} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
 <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} /> Diagnosis Ulang
 </Button>
 </div>

 {analyzing ? (
 <Card className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10 shadow-sm">
 <CardContent className="py-12 flex flex-col items-center justify-center text-teal-600 dark:text-teal-400">
 <div className="relative w-16 h-16 mb-4">
 <div className="absolute inset-0 border-4 border-teal-200 rounded-full"></div>
 <div className="absolute inset-0 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
 <Activity className="absolute inset-0 m-auto w-6 h-6 animate-pulse" />
 </div>
 <h3 className="text-xl font-bold mb-2">AI sedang menganalisis arus kas...</h3>
 <p className="text-sm opacity-80">Mencari anomali pengeluaran dan menghitung proyeksi runway kas.</p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <Card className="border-none shadow-md bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden">
 <div className="absolute -right-4 -top-4 opacity-10">
 <TrendingDown className="w-32 h-32" />
 </div>
 <CardHeader className="relative z-10 pb-2">
 <CardDescription className="text-muted-foreground font-medium tracking-wide uppercase text-xs">Estimated Monthly Burn Rate</CardDescription>
 <CardTitle className="text-4xl font-bold">{formatIDR(burnRate)}</CardTitle>
 </CardHeader>
 <CardContent className="relative z-10">
 <div className="text-sm text-muted-foreground">Tingkat pengeluaran rata-rata bulanan</div>
 </CardContent>
 </Card>

 <Card className="border-none shadow-md bg-gradient-to-br from-teal-500 to-emerald-600 text-white relative overflow-hidden">
 <div className="absolute -right-4 -bottom-4 opacity-20">
 <Activity className="w-32 h-32" />
 </div>
 <CardHeader className="relative z-10 pb-2">
 <CardDescription className="text-teal-100 font-medium tracking-wide uppercase text-xs">Cash Runway Projection</CardDescription>
 <CardTitle className="text-4xl font-bold">{runway.toFixed(1)} Bulan</CardTitle>
 </CardHeader>
 <CardContent className="relative z-10">
 <div className="text-sm text-teal-100">Ketahanan kas sebelum membutuhkan injeksi modal</div>
 </CardContent>
 </Card>
 </div>

 <h2 className="text-xl font-bold pt-4 border-t border-border">Insights & Rekomendasi Eksekutif</h2>
 
 <div className="grid grid-cols-1 gap-4">
 {insights.map((insight, idx) => (
 <div key={idx} className={`p-5 rounded-xl border flex gap-4 ${
 insight.type === 'CRITICAL' ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/30' :
 insight.type === 'WARNING' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30' :
 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30'
 }`}>
 <div className="shrink-0 mt-1">
 {insight.type === 'CRITICAL' ? <AlertCircle className="w-6 h-6 text-rose-500" /> :
 insight.type === 'WARNING' ? <AlertCircle className="w-6 h-6 text-amber-500" /> :
 <Sparkles className="w-6 h-6 text-emerald-500" />}
 </div>
 <div>
 <h3 className={`font-bold text-lg mb-1 ${
 insight.type === 'CRITICAL' ? 'text-rose-700 dark:text-rose-400' :
 insight.type === 'WARNING' ? 'text-amber-700 dark:text-amber-400' :
 'text-primary font-semibold'
 }`}>{insight.title}</h3>
 <p className="text-foreground mb-3">{insight.desc}</p>
 <div className="text-sm bg-card/60 dark:bg-black/20 p-3 rounded-lg border border-white/50 dark:border-white/10">
 <span className="font-bold">💡 Aksi (Rekomendasi AI):</span> <br/>
 {insight.recommendation}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )
}
