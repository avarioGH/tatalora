"use client"

import { useState, useEffect } from"react"
import { 
 Card, CardContent, CardDescription, CardHeader, CardTitle 
} from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Button } from"@/components/ui/button"
import { Users, Search, Plus, Filter, Mail, Phone, MapPin, Star, MoreVertical } from"lucide-react"
import { api } from"@/lib/api"
import Link from"next/link"

export default function CustomersPage() {
 const [loading, setLoading] = useState(true)
 const [customers, setCustomers] = useState<any[]>([])
 const [searchQuery, setSearchQuery] = useState("")

 useEffect(() => {
 fetchCustomers()
 }, [])

 const fetchCustomers = async () => {
 try {
 setLoading(true)
 const res = await api.get('/customers')
 setCustomers(res.data)
 } catch (err) {
 console.error(err)
 } finally {
 setLoading(false)
 }
 }

 const filteredCustomers = customers.filter(c => 
 c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (c.phone && c.phone.includes(searchQuery))
 )

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Pelanggan (CRM)</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Kelola data pelanggan, loyalitas, dan riwayat interaksi mereka.</p>
 </div>
 <div className="flex items-center gap-3">
 <Link href="/customers/loyalty">
 <Button variant="outline" className="gap-2">
 <Star className="w-4 h-4 text-amber-500" /> Poin & Loyalty
 </Button>
 </Link>
 <Button className="gap-2">
 <Plus className="w-4 h-4" /> Pelanggan Baru
 </Button>
 </div>
 </div>

 <Card className="border-border shadow-sm">
 <CardHeader className="pb-4 border-b border-border/60">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <CardTitle className="flex items-center gap-2">
 <Users className="w-5 h-5 text-blue-500" /> Daftar Pelanggan
 </CardTitle>
 <div className="flex items-center gap-2">
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input 
 placeholder="Cari nama, kode, no telp..." 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 bg-muted/30 border-border"
 />
 </div>
 <Button variant="outline" size="icon" className="shrink-0">
 <Filter className="w-4 h-4 text-muted-foreground" />
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {loading ? (
 <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
 <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
 Memuat data pelanggan...
 </div>
 ) : filteredCustomers.length === 0 ? (
 <div className="py-20 text-center text-muted-foreground">Tidak ada pelanggan yang ditemukan.</div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
 {filteredCustomers.map(customer => (
 <div key={customer.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group relative">
 <div className="absolute top-4 right-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
 <MoreVertical className="w-5 h-5" />
 </div>
 
 <div className="flex items-center gap-4 mb-4">
 <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-inner">
 {customer.name.charAt(0).toUpperCase()}
 </div>
 <div>
 <h3 className="font-bold text-foreground dark:text-white truncate max-w-[180px]">{customer.name}</h3>
 <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
 <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground dark:text-muted-foreground">{customer.code}</span>
 </div>
 </div>
 </div>
 
 <div className="space-y-2 text-sm text-muted-foreground dark:text-muted-foreground">
 <div className="flex items-center gap-2">
 <Phone className="w-4 h-4 text-muted-foreground" />
 <span>{customer.phone ||"-"}</span>
 </div>
 <div className="flex items-center gap-2">
 <Mail className="w-4 h-4 text-muted-foreground" />
 <span className="truncate">{customer.email ||"-"}</span>
 </div>
 <div className="flex items-start gap-2">
 <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
 <span className="line-clamp-1">{customer.address ||"-"}</span>
 </div>
 </div>
 
 <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
 <div className="flex items-center gap-1.5 text-xs font-semibold">
 <Star className={`w-4 h-4 ${
 customer.level === 'Gold' || customer.level === 'Platinum' ? 'text-amber-500 fill-amber-500' :
 customer.level === 'Silver' ? 'text-muted-foreground fill-slate-400' :
 'text-orange-700 fill-orange-700'
 }`} />
 <span className={
 customer.level === 'Gold' || customer.level === 'Platinum' ? 'text-amber-600 dark:text-amber-500' :
 customer.level === 'Silver' ? 'text-muted-foreground' :
 'text-orange-800 dark:text-orange-700'
 }>{customer.level} Member</span>
 </div>
 <div className="text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full">
 {customer.point} Poin
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )
}
