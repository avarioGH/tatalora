
"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import api from '@/lib/api'
import { Banknote, FileText } from 'lucide-react'

export default function HrPayroll() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [payrolls, setPayrolls] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPayrolls = async () => {
    try {
      setLoading(true)
      const res = await api.get('/hr/payroll')
      setPayrolls(res.data || [])
    } catch(err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayrolls()
  }, [])

  const handleGenerate = async () => {
    if (!period) return alert("Pilih periode!")
    try {
      setLoading(true)
      await api.post('/hr/payroll/generate', { period })
      alert("Payroll berhasil di-generate!")
      fetchPayrolls()
    } catch(err) {
      console.error(err)
      alert("Gagal generate payroll")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Penggajian (Payroll)</h1>
          <p className="text-muted-foreground">Generate slip gaji otomatis berdasarkan data absensi (potongan telat/absen).</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} />
          <Button onClick={handleGenerate} disabled={loading}>
            <Banknote className="w-4 h-4 mr-2" /> Generate Payroll
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penggajian</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead>Gaji Bersih</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.filter((p: any) => p.period === period).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.period}</TableCell>
                  <TableCell className="font-medium">{p.employee?.first_name}</TableCell>
                  <TableCell>Rp {p.basic_salary?.toLocaleString()}</TableCell>
                  <TableCell className="text-rose-500">Rp {p.total_deduction?.toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-emerald-600">Rp {p.net_pay?.toLocaleString()}</TableCell>
                  <TableCell>{p.status}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1"/> Slip</Button>
                  </TableCell>
                </TableRow>
              ))}
              {payrolls.filter((p: any) => p.period === period).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Tidak ada payroll untuk periode {period}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
