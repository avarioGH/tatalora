"use client"
import { api } from"@/lib/api"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Users, ShoppingBag, TrendingUp, Activity } from"lucide-react"
import { useEffect, useState } from"react"

export default function CRMDashboard() {
 const [loading, setLoading] = useState(true)
 const [stats, setStats] = useState({
 customers: 0,
 orders: 0,
 sales: 0
 })

 useEffect(() => {
 const fetchData = async () => {
 try {
 const token = localStorage.getItem("erp_token")
 
 // Fetch Customers
 const custRes = await api.get("/customers")
 const customers = custRes.data

 // Fetch Orders
 const ordRes = await api.get("/orders")
 const orders = ordRes.data

 let totalSales = 0
 if (Array.isArray(orders)) {
 totalSales = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
 }

 setStats({
 customers: customers.length || 0,
 orders: orders.length || 0,
 sales: totalSales
 })
 } catch (e) {
 console.error("Failed to fetch CRM data", e)
 } finally {
 setLoading(false)
 }
 }
 fetchData()
 }, [])

 const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat("id-ID", { style:"currency", currency:"IDR" }).format(amount)
 }

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">CRM Dashboard</h1>
 <p className="text-muted-foreground">Overview of your customers and sales orders.</p>
 </div>

 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
 <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
 <Users className="w-4 h-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{loading ?"..." : stats.customers}</div>
 <p className="text-xs text-muted-foreground">Registered clients</p>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
 <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
 <ShoppingBag className="w-4 h-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{loading ?"..." : stats.orders}</div>
 <p className="text-xs text-muted-foreground">Sales orders created</p>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
 <CardTitle className="text-sm font-medium">Total Sales Amount</CardTitle>
 <TrendingUp className="w-4 h-4 text-emerald-500" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{loading ?"..." : formatCurrency(stats.sales)}</div>
 <p className="text-xs text-muted-foreground">Lifetime revenue</p>
 </CardContent>
 </Card>
 </div>
 </div>
 )
}
