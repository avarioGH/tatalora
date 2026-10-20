"use client"

import { useState, useEffect } from"react"
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { FinanceAPI } from"@/lib/api"
import { ArrowLeft, Loader2, Download } from"lucide-react"
import Link from"next/link"
import { Button } from"@/components/ui/button"

export default function CashFlowPage() {
 const [data, setData] = useState<any>(null)
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 const res = await FinanceAPI.getCashFlowReport()
 setData(res)
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const formatIDR = (val: number) => {
 return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR" }).format(val)
 }

 const formatDate = (d: string) => {
 return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
 }

 if (loading) {
 return (
 <div className="flex h-[400px] items-center justify-center">
 <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
 </div>
 )
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 pb-10">
 <div className="flex items-center gap-4">
 <Link href="/finance/reports">
 <Button variant="ghost" size="icon">
 <ArrowLeft className="w-4 h-4" />
 </Button>
 </Link>
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Arus Kas (Cash Flow)</h1>
 <p className="text-muted-foreground text-sm">Laporan mutasi pergerakan kas masuk dan keluar</p>
 </div>
 <div className="ml-auto">
 <Button variant="outline" className="gap-2">
 <Download className="w-4 h-4" /> Export
 </Button>
 </div>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Mutasi Kas</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-8">
 {/* Cash Inflow */}
 <div>
 <h3 className="font-semibold text-lg text-primary dark:text-primary border-b pb-2 mb-3">Kas Masuk (Inflows)</h3>
 <div className="space-y-3">
 {data?.cashInflows?.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between text-sm items-center border-b border-border/60 pb-2">
 <div>
 <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
 <div className="text-foreground font-medium">{item.description}</div>
 </div>
 <span className="font-semibold text-primary">{formatIDR(item.amount)}</span>
 </div>
 ))}
 {data?.cashInflows?.length === 0 && <p className="text-sm text-muted-foreground italic">Belum ada kas masuk.</p>}
 </div>
 <div className="flex justify-between font-bold mt-4 text-primary dark:text-emerald-500">
 <span>Total Kas Masuk</span>
 <span>{formatIDR(data?.totalInflow || 0)}</span>
 </div>
 </div>

 {/* Cash Outflow */}
 <div>
 <h3 className="font-semibold text-lg text-red-600 dark:text-red-400 border-b pb-2 mb-3">Kas Keluar (Outflows)</h3>
 <div className="space-y-3">
 {data?.cashOutflows?.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between text-sm items-center border-b border-border/60 pb-2">
 <div>
 <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
 <div className="text-foreground font-medium">{item.description}</div>
 </div>
 <span className="font-semibold text-red-600">{formatIDR(item.amount)}</span>
 </div>
 ))}
 {data?.cashOutflows?.length === 0 && <p className="text-sm text-muted-foreground italic">Belum ada kas keluar.</p>}
 </div>
 <div className="flex justify-between font-bold mt-4 text-red-700 dark:text-red-500">
 <span>Total Kas Keluar</span>
 <span>{formatIDR(data?.totalOutflow || 0)}</span>
 </div>
 </div>

 {/* Net Cash Flow */}
 <div className={`p-4 rounded-xl flex justify-between items-center text-xl font-bold ${
 (data?.netCashFlow || 0) >= 0 
 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800' 
 : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
 }`}>
 <span>Arus Kas Bersih (Net Cash Flow)</span>
 <span>{formatIDR(data?.netCashFlow || 0)}</span>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 )
}
