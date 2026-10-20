"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { ArrowLeft, Users, Briefcase, Building, Download, Printer } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function EmployeeReportPage() {
 const [loading, setLoading] = useState(true)
 
 // Stats
 const [totalEmployees, setTotalEmployees] = useState(0)
 const [totalDepartments, setTotalDepartments] = useState(0)
 
 // Charts
 const [deptData, setDeptData] = useState<any[]>([])
 const [statusData, setStatusData] = useState<any[]>([])

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setLoading(true)
 // Mencoba ambil data dari API HR (Mungkin Phase 4 belum terimplementasi 100%)
 const res = await api.get('/hr/employees').catch(() => ({ data: [] }))
 
 let data = res.data
 
 // MOCK DATA FALLBACK REMOVED

 setTotalEmployees(data.length)

 // Group by Department
 const deptMap: Record<string, number> = {}
 const statusMap: Record<string, number> = { 'Aktif': 0, 'Cuti': 0, 'Nonaktif': 0 }
 
 data.forEach((e: any) => {
 const dept = e.department?.name || e.department || 'Belum Ada'
 deptMap[dept] = (deptMap[dept] || 0) + 1
 
 const stat = e.status || 'Aktif'
 if (statusMap[stat] !== undefined) statusMap[stat]++
 })

 setTotalDepartments(Object.keys(deptMap).length)

 const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
 setDeptData(Object.keys(deptMap).map((key, i) => ({
 name: key,
 value: deptMap[key],
 color: COLORS[i % COLORS.length]
 })))

 setStatusData([
 { name: 'Aktif', value: statusMap['Aktif'] },
 { name: 'Cuti', value: statusMap['Cuti'] },
 { name: 'Nonaktif', value: statusMap['Nonaktif'] }
 ])

 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 if (loading) {
 return <div className="py-20 text-center text-muted-foreground">Memuat laporan karyawan...</div>
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <Link href="/">
 <Button variant="ghost" size="icon" className="rounded-full">
 <ArrowLeft className="w-5 h-5" />
 </Button>
 </Link>
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Laporan Karyawan & SDM</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Ringkasan demografi, departemen, dan status tenaga kerja.</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" className="gap-2 border-border">
 <Download className="w-4 h-4" /> Export CSV
 </Button>
 <Button className="bg-slate-900 hover:bg-slate-800 dark:bg-card dark:hover:bg-slate-200 dark:text-foreground text-white gap-2">
 <Printer className="w-4 h-4" /> Cetak Laporan
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <Card className="border-none shadow-md shadow-blue-200/50 dark:shadow-none bg-gradient-to-br from-blue-500 to-indigo-600 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 p-4 opacity-20">
 <Users className="w-16 h-16" />
 </div>
 <CardHeader className="pb-2 relative z-10 overflow-hidden">
 <CardDescription className="text-blue-100 font-medium tracking-wide uppercase text-xs">Total Karyawan (Headcount)</CardDescription>
 <CardTitle className="text-4xl font-bold truncate">{totalEmployees}</CardTitle>
 </CardHeader>
 <CardContent className="relative z-10">
 <div className="text-sm text-blue-100">Karyawan tercatat di database</div>
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm relative overflow-hidden group hover:border-violet-500 transition-colors">
 <div className="absolute top-4 right-4 p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400">
 <Building className="w-5 h-5" />
 </div>
 <CardHeader className="pb-2 overflow-hidden">
 <CardDescription className="font-medium tracking-wide uppercase text-xs text-muted-foreground truncate">Total Departemen / Divisi</CardDescription>
 <CardTitle className="text-4xl font-bold text-foreground dark:text-white">{totalDepartments}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-sm text-muted-foreground">Struktur organisasi perusahaan</div>
 </CardContent>
 </Card>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <Card className="border-border shadow-sm">
 <CardHeader>
 <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-muted-foreground" /> Distribusi per Departemen</CardTitle>
 <CardDescription>Penyebaran jumlah karyawan di setiap divisi.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="h-[300px] w-full flex flex-col md:flex-row items-center justify-center gap-6">
 <div className="w-full md:w-1/2 h-[250px]">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={deptData}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={80}
 paddingAngle={2}
 dataKey="value"
 >
 {deptData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <RechartsTooltip />
 </PieChart>
 </ResponsiveContainer>
 </div>
 <div className="w-full md:w-1/2 space-y-2">
 {deptData.map((entry, index) => (
 <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 text-sm">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
 <span className="text-muted-foreground font-medium">{entry.name}</span>
 </div>
 <span className="font-bold text-foreground dark:text-white">{entry.value} org</span>
 </div>
 ))}
 </div>
 </div>
 </CardContent>
 </Card>

 <Card className="border-border shadow-sm">
 <CardHeader>
 <CardTitle>Status Tenaga Kerja</CardTitle>
 <CardDescription>Rasio karyawan aktif vs cuti / nonaktif.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={statusData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
 <RechartsTooltip 
 cursor={{fill: 'transparent'}}
 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
 />
 <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
 {statusData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.name === 'Aktif' ? '#10b981' : entry.name === 'Cuti' ? '#f59e0b' : '#94a3b8'} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 )
}
