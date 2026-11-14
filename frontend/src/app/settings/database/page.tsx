"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, Download, RefreshCw, HardDrive, ShieldCheck, CheckCircle2, Clock } from "lucide-react"

export default function SettingsDatabase() {
  const [backingUp, setBackingUp] = useState(false)
  const [lastBackup, setLastBackup] = useState("14 November 2026, 04:00 WIB")
  const [history, setHistory] = useState([
    {
      id: "b-1",
      filename: "tatalora_db_backup_2026-11-14.sql.gz",
      size: "18.4 MB",
      date: "14 Nov 2026, 04:00 WIB",
      status: "SUKSES",
      type: "Automated Daily"
    },
    {
      id: "b-2",
      filename: "tatalora_db_backup_2026-11-13.sql.gz",
      size: "18.1 MB",
      date: "13 Nov 2026, 04:00 WIB",
      status: "SUKSES",
      type: "Automated Daily"
    },
    {
      id: "b-3",
      filename: "tatalora_db_backup_2026-11-12.sql.gz",
      size: "17.9 MB",
      date: "12 Nov 2026, 04:00 WIB",
      status: "SUKSES",
      type: "Automated Daily"
    }
  ])

  const handleManualBackup = () => {
    setBackingUp(true)
    setTimeout(() => {
      const nowStr = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) + " WIB"
      const newEntry = {
        id: "b-" + Date.now(),
        filename: `tatalora_manual_backup_${new Date().toISOString().slice(0, 10)}.sql.gz`,
        size: "18.6 MB",
        date: nowStr,
        status: "SUKSES",
        type: "Manual Snapshot"
      }
      setHistory([newEntry, ...history])
      setLastBackup(nowStr)
      setBackingUp(false)
    }, 2000)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Database className="w-7 h-7 text-primary" />
            Database & Cadangan Data (Backup & Restore)
          </h1>
          <p className="text-muted-foreground text-sm">
            Status pencadangan database berkala (PostgreSQL), snapshot manual, dan pemulihan data bencana.
          </p>
        </div>

        <Button 
          onClick={handleManualBackup} 
          disabled={backingUp} 
          className="bg-primary text-primary-foreground gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${backingUp ? 'animate-spin' : ''}`} />
          {backingUp ? "Membuat Snapshot..." : "Buat Cadangan Manual Sekarang"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Status Backup Otomatis</CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-600 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Aktif (Harian)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Setiap hari pukul 04:00 WIB ke storage terisolasi</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Waktu Backup Terakhir</CardDescription>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> {lastBackup}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Snapshot database berhasil dibuat tanpa kegagalan</p>
          </CardContent>
        </Card>

        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Penyimpanan Terpakai</CardDescription>
            <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" /> 18.6 MB / 50 GB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Retensi cadangan otomatis 30 hari kalender</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-xs">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            Riwayat Cadangan Tersedia
          </CardTitle>
          <CardDescription>
            Berkas arsip database terenkripsi (AES-256) yang dapat diunduh oleh Administrator Sistem.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="p-3 px-4 text-left font-semibold">Nama File Backup</th>
                <th className="p-3 px-4 text-left font-semibold">Jenis Cadangan</th>
                <th className="p-3 px-4 text-left font-semibold">Waktu Pembuatan</th>
                <th className="p-3 px-4 text-right font-semibold">Ukuran</th>
                <th className="p-3 px-4 text-center font-semibold">Status</th>
                <th className="p-3 px-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3 px-4 font-mono text-xs font-semibold text-foreground">
                    {item.filename}
                  </td>
                  <td className="p-3 px-4 text-xs text-muted-foreground">{item.type}</td>
                  <td className="p-3 px-4 text-xs text-muted-foreground">{item.date}</td>
                  <td className="p-3 px-4 text-right text-xs font-medium">{item.size}</td>
                  <td className="p-3 px-4 text-center">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {item.status}
                    </Badge>
                  </td>
                  <td className="p-3 px-4 text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1.5 h-8 text-xs"
                      onClick={() => alert(`Mengunduh berkas arsip: ${item.filename}`)}
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
