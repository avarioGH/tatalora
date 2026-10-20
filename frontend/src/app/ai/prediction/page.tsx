"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { ArrowLeft, Sparkles, LineChart as LineChartIcon, RefreshCw } from"lucide-react"
import { api } from"@/lib/api"
import { formatIDR } from"@/lib/utils"
import Link from"next/link"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

export default function AIPredictionPage() {
 const [loading, setLoading] = useState(true)
 const [analyzing, setAnalyzing] = useState(false)
 
 const [forecastData, setForecastData] = useState<any[]>([])
 const [projectedGrowth, setProjectedGrowth] = useState(0)
 const [accuracyConfidence, setAccuracyConfidence] = useState(0)

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setLoading(true)
 const res = await api.get('/pos/history')
 runAIPrediction(res.data)
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const runAIPrediction = async (salesOrders: any[]) => {
 setAnalyzing(true)
 
 try {
 // 1. Group past sales by day (last 7 days)
 const pastMap: Record<string, number> = {}
 const today = new Date()
 today.setHours(0,0,0,0)
 
 const last7Days = [...Array(7)].map((_, i) => {
 const d = new Date(today)
 d.setDate(d.getDate() - (6 - i))
 return d
 })

 last7Days.forEach(d => pastMap[d.toISOString().split('T')[0]] = 0)

 salesOrders.forEach(o => {
 if (o.status !== 'COMPLETED') return
 const d = new Date(o.order_date).toISOString().split('T')[0]
 if (pastMap[d] !== undefined) {
 pastMap[d] += Number(o.total_amount)
 }
 })

 const pastValues = Object.values(pastMap)
 
 // 2. Call AI API
 const contextData = {
 last7DaysSales: Object.entries(pastMap).map(([date, amount]) => ({ date, amount }))
 }

 const prompt = `Tolong analisis data historis penjualan 7 hari terakhir ini. Prediksikan total omzet untuk 7 hari ke depan. Berikan output HANYA format JSON tanpa markdown block: {"projectedGrowth": number (persentase pertumbuhan/penurunan total 7 hari depan vs 7 hari lalu, misal 5.5),"accuracyConfidence": number (tingkat kepercayaan model 1-100),"predictedSales": [number, number, number, number, number, number, number] (array 7 angka untuk prediksi 7 hari ke depan secara berurutan)}`

 const res = await api.post('/platform/ai/ask', {
 prompt,
 contextData
 })

 let responseText = res.data
 if (typeof responseText === 'string') {
 responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()
 } else if (responseText && responseText.text) {
 responseText = responseText.text.replace(/```json/gi, '').replace(/```/g, '').trim()
 }
 
 const parsed = typeof responseText === 'string' ? JSON.parse(responseText) : responseText
 const predictedSales = parsed.predictedSales || [0,0,0,0,0,0,0]

 // 3. Build Chart Data
 const chartData: any[] = []
 
 // Push Past Data
 last7Days.forEach((d, i) => {
 chartData.push({
 name: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
 Aktual: pastValues[i],
 Prediksi: null
 })
 })

 // Push Future Data (Forecast)
 for (let i = 1; i <= 7; i++) {
 const d = new Date(today)
 d.setDate(d.getDate() + i)
 
 chartData.push({
 name: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
 Aktual: null,
 Prediksi: predictedSales[i - 1] || 0
 })
 }

 setForecastData(chartData)
 setProjectedGrowth(parsed.projectedGrowth || 0)
 setAccuracyConfidence(parsed.accuracyConfidence || 0)

 } catch (e) {
 console.error("AI Prediction failed", e)
 setProjectedGrowth(0)
 setAccuracyConfidence(0)
 setForecastData([])
 } finally {
 setAnalyzing(false)
 }
 }

 if (loading) {
 return <div className="py-20 text-center text-muted-foreground">Menarik data historis penjualan...</div>
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <Link href="/">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2">
 Prediksi AI (Forecasting) <Sparkles className="w-6 h-6 text-violet-500" />
 </h1>
 <p className="text-[14px] text-muted-foreground mt-1">Peramalan penjualan masa depan menggunakan model regresi linier.</p>
 </div>
 </div>
 <Button onClick={fetchData} disabled={analyzing} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
 <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} /> Generate Ulang
 </Button>
 </div>

 {analyzing ? (
 <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 shadow-sm">
 <CardContent className="py-12 flex flex-col items-center justify-center text-violet-600 dark:text-violet-400">
 <div className="relative w-16 h-16 mb-4">
 <div className="absolute inset-0 border-4 border-violet-200 rounded-full"></div>
 <div className="absolute inset-0 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
 <LineChartIcon className="absolute inset-0 m-auto w-6 h-6 animate-pulse" />
 </div>
 <h3 className="text-xl font-bold mb-2">Melatih model Machine Learning...</h3>
 <p className="text-sm opacity-80">Menemukan pola tren dari data historis Anda untuk meramal masa depan.</p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <Card className="border-none shadow-md shadow-violet-200/50 dark:shadow-none bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white relative overflow-hidden">
 <CardHeader className="pb-2">
 <CardDescription className="text-violet-100 font-medium tracking-wide uppercase text-xs">Proyeksi Pertumbuhan (7 Hari Kedepan)</CardDescription>
 <CardTitle className="text-4xl font-bold">
 {projectedGrowth > 0 ? '+' : ''}{projectedGrowth.toFixed(1)}%
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-sm text-violet-100">Dibandingkan dengan 7 hari sebelumnya</div>
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm">
 <CardHeader className="pb-2">
 <CardDescription className="font-medium tracking-wide uppercase text-xs text-muted-foreground">Tingkat Kepercayaan Model (Confidence Score)</CardDescription>
 <CardTitle className="text-4xl font-bold text-foreground dark:text-white">{accuracyConfidence.toFixed(1)}%</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="w-full bg-muted rounded-full h-2 mt-3">
 <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${accuracyConfidence}%` }}></div>
 </div>
 <div className="text-xs text-muted-foreground mt-2">Berdasarkan konsistensi data historis</div>
 </CardContent>
 </Card>
 </div>

 <Card className="border-border shadow-sm">
 <CardHeader>
 <CardTitle>Kurva Prediksi Penjualan</CardTitle>
 <CardDescription>Garis tegas merepresentasikan data aktual, garis putus-putus adalah ramalan AI.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="h-[400px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={forecastData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
 <YAxis 
 axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10}
 tickFormatter={(value) => `Rp${(value/1000000).toFixed(1)}M`}
 />
 <RechartsTooltip 
 formatter={(value: any) => formatIDR(value)}
 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
 />
 <Legend wrapperStyle={{ paddingTop: '20px' }} />
 <ReferenceLine x={forecastData[6]?.name} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: 'Hari Ini', fill: '#94a3b8', fontSize: 12 }} />
 <Line type="monotone" name="Penjualan Aktual" dataKey="Aktual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
 <Line type="monotone" name="Prediksi AI" dataKey="Prediksi" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 </div>
 )}
 </div>
 )
}
