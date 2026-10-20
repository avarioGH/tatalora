
"use client"
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import api from '@/lib/api'
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function HrAttendance() {
  const [attendances, setAttendances] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employeeId, setEmployeeId] = useState("")
  const [inDate, setInDate] = useState("");
  const [inTime, setInTime] = useState("");
  const [outDate, setOutDate] = useState("");
  const [outTime, setOutTime] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true)
      const empRes = await api.get('/hr/employees')
      setEmployees(empRes.data)
      const attRes = await api.get('/hr/attendance') // Assuming this exists or returns list
      setAttendances(attRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveAttendance = async () => {
    if (!employeeId || !inDate || !inTime) return alert("Karyawan, Tgl Masuk, dan Jam Masuk wajib diisi")
    try {
      const checkInDate = new Date(inDate + 'T' + inTime + ':00');
      const res = await api.post('/hr/attendance/clock-in', {
        employeeId,
        time: checkInDate.toISOString()
      });
      
      const attendanceId = res.data?.id;

      if (outDate && outTime && attendanceId) {
         const checkOutDate = new Date(outDate + 'T' + outTime + ':00');
         await api.post('/hr/attendance/clock-out', {
           attendanceId,
           time: checkOutDate.toISOString()
         });
      }

      alert("Berhasil menyimpan absensi manual");
      setInDate(""); setInTime(""); setOutDate(""); setOutTime("");
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal: " + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message));
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kehadiran (Absensi)</h1>
          <p className="text-muted-foreground">Kelola jam kerja dan pantau keterlambatan karyawan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Input Absensi Manual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Karyawan</Label>
                <select className="w-full p-2 rounded-md border bg-background" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Tgl Masuk</Label>
                  <Input type="date" value={inDate} onChange={e => setInDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Jam Masuk</Label>
                  <Input type="time" value={inTime} onChange={e => setInTime(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Tgl Keluar (Ops)</Label>
                  <Input type="date" value={outDate} onChange={e => setOutDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Jam Keluar</Label>
                  <Input type="time" value={outTime} onChange={e => setOutTime(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSaveAttendance}>Simpan Absensi</Button>
              <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                * Tgl & Jam keluar opsional jika belum pulang.
              </div>
            </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Riwayat Absensi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.slice(0, 10).map((att: any) => (
                  <TableRow key={att.id}>
                    <TableCell>{new Date(att.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{att.employee?.first_name} {att.employee?.last_name}</TableCell>
                    <TableCell>{att.check_in ? new Date(att.check_in).toLocaleTimeString() : '-'}</TableCell>
                    <TableCell>{att.check_out ? new Date(att.check_out).toLocaleTimeString() : '-'}</TableCell>
                    <TableCell>
                      {att.status === 'LATE' ? (
                        <Badge variant="destructive" className="flex w-fit items-center gap-1"><AlertCircle className="w-3 h-3"/> Terlambat</Badge>
                      ) : att.status === 'PRESENT' ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 flex w-fit items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Hadir</Badge>
                      ) : (
                        <Badge variant="outline">{att.status}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {attendances.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Belum ada data absensi.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
