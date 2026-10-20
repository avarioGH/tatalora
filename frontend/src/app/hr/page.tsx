"use client"
import { HrAPI } from"@/lib/api"

import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { Users, Clock, Banknote } from"lucide-react"
import { useEffect, useState } from"react"

export default function HrDashboard() {
 const [loading, setLoading] = useState(true)
 const [stats, setStats] = useState({ employees: 0, presentToday: 0, payrolls: 0 })

 useEffect(() => {
 const fetchData = async () => {
 try {
 const [employees, attendance, payrolls] = await Promise.all([
 HrAPI.getEmployees(),
 HrAPI.getAttendances(),
 HrAPI.getPayrolls()
 ])

 setStats({
 employees: employees.length,
 presentToday: attendance.filter((a: any) => {
 const date = new Date(a.date).toISOString().split('T')[0]
 const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
 return date === today && a.status === 'Present'
 }).length,
 payrolls: payrolls.length
 })
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 }
 }
 fetchData()
 }, [])

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">HR & Payroll Dashboard</h1>
 <p className="text-muted-foreground">Overview of employees, attendance, and salary.</p>
 </div>

 <div className="grid gap-4 md:grid-cols-3">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
 <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
 <Users className="w-4 h-4 text-blue-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{loading ?"..." : stats.employees}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
 <CardTitle className="text-sm font-medium">Present Today</CardTitle>
 <Clock className="w-4 h-4 text-emerald-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{loading ?"..." : stats.presentToday}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
 <CardTitle className="text-sm font-medium">Processed Payrolls</CardTitle>
 <Banknote className="w-4 h-4 text-amber-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{loading ?"..." : stats.payrolls}</div>
 </CardContent>
 </Card>
 </div>
 </div>
 )
}
