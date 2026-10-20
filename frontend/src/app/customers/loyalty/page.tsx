"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { ArrowLeft, Star, TrendingUp, Users, Award, Trophy } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts'

export default function LoyaltyPage() {
 const [loading, setLoading] = useState(true)
 const [customers, setCustomers] = useState<any[]>([])
 
 // Stats
 const [totalPoints, setTotalPoints] = useState(0)
 const [tierDistribution, setTierDistribution] = useState<any[]>([])
 const [topCustomers, setTopCustomers] = useState<any[]>([])

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setLoading(true)
 const res = await api.get('/customers')
 const data = res.data
 setCustomers(data)

 let points = 0
 const tiers: Record<string, number> = { 'Bronze': 0, 'Silver': 0, 'Gold': 0, 'Platinum': 0 }
 
 data.forEach((c: any) => {
 points += c.point || 0
 if (tiers[c.level] !== undefined) {
 tiers[c.level]++
 }
 })

 setTotalPoints(points)
 
 const tierData = [
 { name: 'Bronze', value: tiers['Bronze'], color: '#cd7f32' },
 { name: 'Silver', value: tiers['Silver'], color: '#94a3b8' },
 { name: 'Gold', value: tiers['Gold'], color: '#fbbf24' },
 { name: 'Platinum', value: tiers['Platinum'], color: '#3b82f6' },
 ]
 setTierDistribution(tierData)

 // Top 5 customers by points
 const sorted = [...data].sort((a, b) => (b.point || 0) - (a.point || 0)).slice(0, 5)
 setTopCustomers(sorted)

 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 if (loading) {
 return <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
 <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
 Memuat dasbor loyalty...
 </div>
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
 <div className="flex items-center gap-4">
 <Link href="/customers">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Loyalty & Poin</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Pantau keterlibatan pelanggan dan distribusi program loyalitas.</p>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <Card className="border-none shadow-md shadow-amber-200/50 dark:shadow-none bg-gradient-to-br from-amber-400 to-orange-500 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 p-4 opacity-20">
 <Star className="w-16 h-16" />
 </div>
 <CardHeader className="pb-2 relative z-10 overflow-hidden">
 <CardDescription className="text-amber-50 font-medium tracking-wide uppercase text-xs">Total Poin Beredar</CardDescription>
 <CardTitle className="text-4xl font-bold truncate">{totalPoints.toLocaleString('id-ID')}</CardTitle>
 </CardHeader>
 <CardContent className="relative z-10">
 <div className="text-sm text-amber-50 opacity-90">Poin aktif yang dimiliki pelanggan</div>
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm relative overflow-hidden group hover:border-blue-500 transition-colors">
 <div className="absolute top-4 right-4 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
 <Users className="w-5 h-5" />
 </div>
 <CardHeader className="pb-2 overflow-hidden">
 <CardDescription className="font-medium tracking-wide uppercase text-xs text-muted-foreground truncate">Total Member Terdaftar</CardDescription>
 <CardTitle className="text-3xl font-bold text-foreground dark:text-white">{customers.length}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-sm text-muted-foreground">Pelanggan yang masuk dalam program</div>
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-colors">
 <div className="absolute top-4 right-4 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-primary dark:text-primary">
 <Award className="w-5 h-5" />
 </div>
 <CardHeader className="pb-2 overflow-hidden">
 <CardDescription className="font-medium tracking-wide uppercase text-xs text-muted-foreground truncate">Member VIP (Gold/Platinum)</CardDescription>
 <CardTitle className="text-3xl font-bold text-foreground dark:text-white">
 {tierDistribution.find(t => t.name === 'Gold')?.value + tierDistribution.find(t => t.name === 'Platinum')?.value}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-sm text-muted-foreground">Pelanggan dengan transaksi tertinggi</div>
 </CardContent>
 </Card>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <Card className="border-border shadow-sm">
 <CardHeader>
 <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-muted-foreground" /> Distribusi Tier Pelanggan</CardTitle>
 <CardDescription>Komposisi pelanggan berdasarkan level membership.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={tierDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
 <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
 <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
 <RechartsTooltip 
 cursor={{fill: 'transparent'}}
 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
 />
 <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
 {tierDistribution.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm">
 <CardHeader>
 <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Top 5 Pelanggan Sultan</CardTitle>
 <CardDescription>Berdasarkan perolehan poin tertinggi saat ini.</CardDescription>
 </CardHeader>
 <CardContent>
 {topCustomers.length > 0 ? (
 <div className="space-y-4">
 {topCustomers.map((customer, idx) => (
 <div key={customer.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 p-3 rounded-lg bg-muted/40 border border-border/60">
 <div className="flex items-center gap-3">
 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${
 idx === 0 ? 'bg-amber-400' :
 idx === 1 ? 'bg-slate-300 text-foreground' :
 idx === 2 ? 'bg-orange-700' : 'bg-slate-800 '
 }`}>
 #{idx + 1}
 </div>
 <div>
 <div className="font-bold text-foreground dark:text-white text-sm">{customer.name}</div>
 <div className="text-xs text-muted-foreground">{customer.level} Member</div>
 </div>
 </div>
 <div className="text-right">
 <div className="font-bold text-amber-600 dark:text-amber-500">{customer.point.toLocaleString('id-ID')}</div>
 <div className="text-xs text-muted-foreground">Poin</div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="py-20 text-center text-muted-foreground">Belum ada pelanggan dengan poin.</div>
 )}
 </CardContent>
 </Card>
 </div>

 </div>
 )
}
