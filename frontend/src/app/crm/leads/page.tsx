"use client"
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, Search, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'

const MOCK_LEADS = [
 { id: 1, name: 'John Doe', company: 'Tech Startup X', email: 'john@startupx.com', phone: '0812345678', source: 'Website', status: 'New' },
 { id: 2, name: 'Sarah Jane', company: 'PT Retail', email: 'sarah@retail.co.id', phone: '089999111', source: 'Referral', status: 'Contacted' },
 { id: 3, name: 'Michael C.', company: 'Indo Logistics', email: 'mike@indo.com', phone: '0855544433', source: 'Cold Call', status: 'Qualified' },
]

export default function LeadsPage() {
 const [searchTerm, setSearchTerm] = useState("")

 const filtered = MOCK_LEADS.filter(o => 
 o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
 o.company.toLowerCase().includes(searchTerm.toLowerCase())
 )

 const getStatusBadge = (status: string) => {
 switch(status) {
 case 'New': return <Badge variant="secondary" className="bg-blue-50 text-blue-700">New</Badge>
 case 'Contacted': return <Badge variant="outline" className="text-amber-600 border-amber-200">Contacted</Badge>
 case 'Qualified': return <Badge className="bg-emerald-500">Qualified</Badge>
 default: return <Badge>{status}</Badge>
 }
 }

 return (
 <div className="space-y-6 pb-10">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Leads</h1>
 <p className="text-muted-foreground mt-1">Manage new inquiries and potential customers before they become opportunities.</p>
 </div>
 <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> New Lead</Button>
 </div>

 <Card className="shadow-sm">
 <CardHeader className="pb-4 border-b border-border/40">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <CardTitle className="text-[16px] font-semibold">All Leads</CardTitle>
 <div className="flex items-center gap-2">
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input 
 type="search" 
 placeholder="Search leads..." 
 className="pl-8" 
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <Button variant="outline" size="icon">
 <Filter className="h-4 w-4" />
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead className="bg-muted border-y border-border">
 <tr>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Name</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Company</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Contact</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Source</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Action</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((item) => (
 <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer">
 <td className="p-4 px-6 font-medium">{item.name}</td>
 <td className="py-3.5 px-6 text-[13px]">{item.company}</td>
 <td className="p-4 px-6 text-muted-foreground">
 <div>{item.email}</div>
 <div className="text-xs">{item.phone}</div>
 </td>
 <td className="p-4 px-6 text-muted-foreground">{item.source}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">{getStatusBadge(item.status)}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">
 <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
 View <ChevronRight className="ml-1 h-3 w-3" />
 </Button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 </div>
 )
}
