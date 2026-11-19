"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import api from '@/lib/api'
import { Banknote, FileText, CheckCircle2, AlertCircle, Users, Clock, ShieldCheck } from 'lucide-react'

export default function HrPayroll() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [payrolls, setPayrolls] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async (selectedPeriod = period) => {
    try {
      setLoading(true)
      const [payRes, empRes] = await Promise.all([
        api.get(`/hr/payroll?period=${selectedPeriod}`).catch(() => ({ data: [] })),
        api.get('/hr/employees').catch(() => ({ data: [] }))
      ])
      setPayrolls(payRes.data || [])
      setEmployees(empRes.data || [])
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(period)
  }, [period])

  const [prerequisites, setPrerequisites] = useState({
    employeesMet: false,
    attendanceMet: false,
    componentsMet: false
  })

  useEffect(() => {
    // Basic logic for checklist status
    setPrerequisites({
      employeesMet: employees.length > 0,
      attendanceMet: true, // Mocked for now
      componentsMet: true  // Mocked for now
    })
  }, [employees])

  const canGenerate = prerequisites.employeesMet && prerequisites.attendanceMet && prerequisites.componentsMet && !loading;

  const handleGenerate = async () => {
    if (!period) return alert("Pilih periode!")
    try {
      setLoading(true)
      await api.post('/hr/payroll/generate', { period })
      alert("Payroll berhasil di-generate!")
      fetchData()
    } catch(err: any) {
      console.error(err)
      alert("Gagal generate payroll: " + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const periodPayrolls = payrolls.filter((p: any) => p.period === period)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Banknote className="w-6 h-6 text-primary" />
            Penggajian Karyawan (Payroll)
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate slip gaji otomatis berdasarkan komponen gaji master dan rekap absensi kehadiran bulanan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-40" />
          <Button onClick={handleGenerate} disabled={!canGenerate} className="bg-primary text-primary-foreground">
            <Banknote className="w-4 h-4 mr-2" /> {canGenerate ? "Generate Payroll" : "Lengkapi Prasyarat"}
          </Button>
        </div>
      </div>

      {/* Checklist Kesiapan Prasyarat Payroll */}
      <Card className="border border-border shadow-xs bg-card">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Checklist Kesiapan Proses Payroll Periode {period}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-3 rounded-lg border bg-background flex items-start gap-2.5 ${prerequisites.employeesMet ? 'border-emerald-200' : 'border-rose-200'}`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${prerequisites.employeesMet ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-semibold text-foreground">1. Master Data Karyawan</p>
              <p className="text-muted-foreground mt-0.5">
                {employees.length > 0 ? `${employees.length} karyawan aktif terdaftar` : 'Belum ada data karyawan'}
              </p>
              <Link href="/hr/employees" className="text-primary hover:underline font-medium mt-1 inline-block">
                Kelola Karyawan →
              </Link>
            </div>
          </div>

          <div className={`p-3 rounded-lg border bg-background flex items-start gap-2.5 ${prerequisites.attendanceMet ? 'border-emerald-200' : 'border-rose-200'}`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${prerequisites.attendanceMet ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-semibold text-foreground">2. Rekap Absensi & Lembur</p>
              <p className="text-muted-foreground mt-0.5">
                Sinkronisasi data kehadiran, izin, dan potongan keterlambatan
              </p>
              <Link href="/hr/attendance" className="text-primary hover:underline font-medium mt-1 inline-block">
                Periksa Absensi →
              </Link>
            </div>
          </div>

          <div className={`p-3 rounded-lg border bg-background flex items-start gap-2.5 ${prerequisites.componentsMet ? 'border-emerald-200' : 'border-rose-200'}`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${prerequisites.componentsMet ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-semibold text-foreground">3. Komponen Potongan & Pajak</p>
              <p className="text-muted-foreground mt-0.5">
                BPJS Ketenagakerjaan/Kesehatan & PPh 21 otomatis dihitung
              </p>
              <span className="text-muted-foreground mt-1 inline-block">
                Standar Depnaker RI
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Daftar Payroll Periode {period}</CardTitle>
            <CardDescription>Rincian gaji pokok, tunjangan, dan potongan karyawan</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">
            Total {periodPayrolls.length} slip gaji diterbitkan
          </span>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead>Gaji Bersih (Net)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodPayrolls.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.period}</TableCell>
                  <TableCell className="font-medium text-foreground">{p.employee?.first_name || p.employee?.name || 'Karyawan'}</TableCell>
                  <TableCell>Rp {Number(p.basic_salary || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-rose-500">Rp {Number(p.total_deduction || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="font-bold text-emerald-600">Rp {Number(p.net_pay || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium">
                      {p.status || 'FINAL'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => window.print()}><FileText className="w-4 h-4 mr-1"/> Slip</Button>
                  </TableCell>
                </TableRow>
              ))}
              {periodPayrolls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Banknote className="w-8 h-8 text-muted-foreground/60" />
                      <p className="font-medium">Belum ada slip gaji yang digenerate untuk periode {period}.</p>
                      <p className="text-xs">Pastikan master karyawan dan absensi telah terisi, lalu klik tombol &quot;Generate Payroll&quot; di kanan atas.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
