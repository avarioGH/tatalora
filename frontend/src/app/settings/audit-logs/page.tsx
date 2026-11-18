"use client"

import React, { useState, useEffect } from "react"
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { 
  Search, ShieldAlert, RefreshCw, FileText, Calendar, User, Laptop
} from "lucide-react"
import { api } from "@/lib/api"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const fetchLogs = async () => {
    setLoading(true)
    try {
      // First try /platform/audit-logs which is available in running backend
      const res = await api.get('/platform/audit-logs').catch(() => null)
      if (res && res.data) {
        setLogs(Array.isArray(res.data) ? res.data : (res.data.data || []))
      } else {
        const adminRes = await api.get('/admin/audit-logs').catch(() => ({ data: [] }))
        setLogs(Array.isArray(adminRes.data) ? adminRes.data : [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase()
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.entity && log.entity.toLowerCase().includes(q)) ||
      (log.user_id && log.user_id.toLowerCase().includes(q)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(q))
    )
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-600" />
            Audit Logs & Riwayat Aktivitas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Catatan log transaksi, perubahan master data, dan aktivitas sistem yang tidak dapat diubah (Immutable & Read-Only).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">Daftar Aktivitas Sistem</CardTitle>
              <CardDescription>Menampilkan log aktivitas terbaru dalam sistem.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Cari aksi, entitas, IP..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Waktu & Tanggal</TableHead>
                  <TableHead className="w-[120px]">Aksi</TableHead>
                  <TableHead>Entitas & ID</TableHead>
                  <TableHead>Pengguna / IP</TableHead>
                  <TableHead>Perubahan Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                        Memuat data audit logs...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <FileText className="w-8 h-8 text-muted-foreground/40 mb-1" />
                        <span className="font-medium text-foreground">Belum ada riwayat audit log</span>
                        <span className="text-xs text-muted-foreground">Log transaksi atau perubahan data akan otomatis tersimpan di sini.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {new Date(log.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {new Date(log.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })} WIB
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          log.action?.includes('CREATE') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          log.action?.includes('UPDATE') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          log.action?.includes('DELETE') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }>
                          {log.action || 'ACTIVITY'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium text-slate-900">{log.entity || 'System'}</div>
                        {log.entity_id && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{log.entity_id}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <div className="flex items-center gap-1 text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System Automator'}
                        </div>
                        {log.ip_address && (
                          <div className="flex items-center gap-1 text-slate-400 text-[11px] mt-0.5">
                            <Laptop className="w-3 h-3" />
                            {log.ip_address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {log.after_data ? (
                          <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {JSON.stringify(log.after_data).substring(0, 50)}...
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
