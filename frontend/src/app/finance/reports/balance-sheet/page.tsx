"use client"

import { useState, useEffect } from"react"
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { FinanceAPI } from"@/lib/api"
import { ArrowLeft, Loader2, Download, Scale } from"lucide-react"
import Link from"next/link"
import { Button } from"@/components/ui/button"

export default function BalanceSheetPage() {
 const [data, setData] = useState<any>(null)
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 const res = await FinanceAPI.getBalanceSheetReport()
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
 <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">Neraca Keuangan</h1>
 <p className="text-muted-foreground text-sm">Balance Sheet - Posisi Keuangan Perusahaan</p>
 </div>
 <div className="ml-auto">
 <Button variant="outline" className="gap-2">
 <Download className="w-4 h-4" /> Export
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* ASSETS */}
 <Card className="border-t-4 border-t-blue-500 shadow-md">
 <CardHeader className="bg-muted/30/50 pb-4">
 <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center gap-2">
 <Scale className="w-5 h-5" /> Aktiva (Assets)
 </CardTitle>
 </CardHeader>
 <CardContent className="pt-6">
 <div className="space-y-4">
 {data?.assets?.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between text-sm items-center border-b border-dashed border-border pb-2">
 <span className="text-foreground font-medium">{item.name}</span>
 <span className="font-semibold">{formatIDR(item.amount)}</span>
 </div>
 ))}
 
 <div className="flex justify-between items-center pt-4 text-lg font-bold text-blue-700 dark:text-blue-400">
 <span>Total Aktiva</span>
 <span>{formatIDR(data?.totalAssets || 0)}</span>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* LIABILITIES & EQUITY */}
 <div className="space-y-6">
 <Card className="border-t-4 border-t-orange-500 shadow-md">
 <CardHeader className="bg-muted/30/50 pb-4">
 <CardTitle className="text-orange-700 dark:text-orange-400">Kewajiban (Liabilities)</CardTitle>
 </CardHeader>
 <CardContent className="pt-6">
 <div className="space-y-4">
 {data?.liabilities?.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between text-sm items-center border-b border-dashed border-border pb-2">
 <span className="text-foreground font-medium">{item.name}</span>
 <span className="font-semibold">{formatIDR(item.amount)}</span>
 </div>
 ))}
 
 <div className="flex justify-between items-center pt-2 text-md font-bold text-orange-700 dark:text-orange-500">
 <span>Total Kewajiban</span>
 <span>{formatIDR(data?.totalLiabilities || 0)}</span>
 </div>
 </div>
 </CardContent>
 </Card>

 <Card className="border-t-4 border-t-purple-500 shadow-md">
 <CardHeader className="bg-muted/30/50 pb-4">
 <CardTitle className="text-purple-700 dark:text-purple-400">Ekuitas (Equity)</CardTitle>
 </CardHeader>
 <CardContent className="pt-6">
 <div className="space-y-4">
 {data?.equity?.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between text-sm items-center border-b border-dashed border-border pb-2">
 <span className="text-foreground font-medium">{item.name}</span>
 <span className="font-semibold">{formatIDR(item.amount)}</span>
 </div>
 ))}
 
 <div className="flex justify-between items-center pt-2 text-md font-bold text-purple-700 dark:text-purple-500">
 <span>Total Ekuitas</span>
 <span>{formatIDR(data?.totalEquity || 0)}</span>
 </div>
 </div>
 </CardContent>
 </Card>
 
 <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex justify-between items-center text-lg font-bold">
 <span>Total Pasiva (Kewajiban + Ekuitas)</span>
 <span>{formatIDR((data?.totalLiabilities || 0) + (data?.totalEquity || 0))}</span>
 </div>
 </div>
 </div>
 </div>
 )
}
