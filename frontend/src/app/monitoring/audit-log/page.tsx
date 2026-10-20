"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardHeader, CardTitle, CardDescription 
} from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { ArrowLeft, ShieldAlert, Search, ShieldCheck, Monitor, MapPin, Key } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"

export default function AuditLogPage() {
 const [loading, setLoading] = useState(true)
 const [logs, setLogs] = useState<any[]>([])
 const [search, setSearch] = useState("")

 useEffect(() => {
 fetchLogs()
 }, [])

 const fetchLogs = async () => {
 try {
 setLoading(true)
 const res = await api.get('/platform/audit-logs')
 setLogs(res.data)
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const filteredLogs = (Array.isArray(logs) ? logs : []).filter(log => 
 log.action?.toLowerCase().includes(search.toLowerCase()) || 
 log.entity?.toLowerCase().includes(search.toLowerCase()) ||
 log.ip_address?.toLowerCase().includes(search.toLowerCase())
 )

 const getActionColor = (action: string) => {
 if (action.includes('DELETE') || action.includes('FAILED')) return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'
 if (action.includes('UPDATE')) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
 if (action.includes('CREATE')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
 return 'text-muted-foreground bg-muted/30 '
 }

 const formatAction = (action: string) => {
 return action.replace(/_/g, ' ')
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
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2">
 Keamanan & Audit Log <ShieldCheck className="w-6 h-6 text-emerald-500" />
 </h1>
 <p className="text-muted-foreground mt-1">Pantau seluruh aktivitas pengguna dan perubahan sistem.</p>
 </div>
 </div>
 
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input 
 placeholder="Cari aktivitas..." 
 value={search} onChange={e => setSearch(e.target.value)}
 className="pl-9 bg-card"
 />
 </div>
 </div>

 <Card className="border-border shadow-sm overflow-hidden">
 <CardHeader className="bg-muted/20 border-b border-border/60">
 <CardTitle className="text-[16px] font-semibold">Jejak Aktivitas (Chronological Order)</CardTitle>
 <CardDescription>Menampilkan 50 aktivitas terakhir di sistem ini.</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? (
 <div className="py-20 text-center text-muted-foreground">Membaca log keamanan...</div>
 ) : filteredLogs.length === 0 ? (
 <div className="py-20 text-center text-muted-foreground">
 <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 dark:text-foreground mb-3" />
 Tidak ada log yang ditemukan.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left">
 <thead className="text-xs text-muted-foreground uppercase bg-muted/30/50 border-b border-border/60">
 <tr>
 <th className="px-6 py-4 font-semibold">Waktu & Tanggal</th>
 <th className="px-6 py-4 font-semibold">Aksi (Action)</th>
 <th className="px-6 py-4 font-semibold">Target Modul</th>
 <th className="px-6 py-4 font-semibold">Data Jejak Jaringan</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {filteredLogs.map((log) => (
 <tr key={log.id} className="hover:bg-muted/30 dark:hover:bg-slate-900/30 transition-colors">
 <td className="px-6 py-4">
 <div className="font-medium text-foreground dark:text-white">
 {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
 </div>
 <div className="text-xs text-muted-foreground">
 {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
 </div>
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getActionColor(log.action)}`}>
 {formatAction(log.action)}
 </span>
 </td>
 <td className="px-6 py-4 font-medium text-foreground">
 {log.entity || 'General'}
 </td>
 <td className="px-6 py-4">
 <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
 <div className="flex items-center gap-1.5">
 <MapPin className="w-3.5 h-3.5 shrink-0" /> {log.ip_address || '127.0.0.1'}
 </div>
 <div className="flex items-center gap-1.5">
 <Monitor className="w-3.5 h-3.5 shrink-0" /> {log.browser || 'Unknown Client'} ({log.device || 'Unknown OS'})
 </div>
 {log.user_id && (
 <div className="flex items-center gap-1.5 mt-1 text-indigo-500">
 <Key className="w-3.5 h-3.5 shrink-0" /> User ID: {log.user_id.substring(0,8)}...
 </div>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )
}
