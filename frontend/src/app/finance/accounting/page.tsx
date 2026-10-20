"use client"
import { useState, useEffect } from"react"
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { api } from"@/lib/api"

export default function AccountingDashboard() {
 const [journals, setJournals] = useState<any[]>([])

 useEffect(() => {
 // We would fetch real GL endpoints here
 }, [])

 return (
 <div className="p-6 max-w-7xl mx-auto space-y-6">
 <h1 className="text-3xl font-bold">Accounting Dashboard</h1>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <Card>
 <CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader>
 <CardContent><p className="text-2xl font-bold">Belum tersedia</p></CardContent>
 </Card>
 <Card>
 <CardHeader><CardTitle>Total Expenses</CardTitle></CardHeader>
 <CardContent><p className="text-2xl font-bold">Belum tersedia</p></CardContent>
 </Card>
 <Card>
 <CardHeader><CardTitle>Net Profit</CardTitle></CardHeader>
 <CardContent><p className="text-2xl font-bold">Belum tersedia</p></CardContent>
 </Card>
 </div>
 </div>
 )
}
