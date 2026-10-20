"use client"
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, Search, ChevronRight, User } from 'lucide-react'
import { Input } from '@/components/ui/input'

const MOCK_OPPS = [
 { id: 1, title: 'ERP Implementation', company: 'PT ABC Indonesia', amount: 150000000, stage: 'Proposal Sent', expected_close: '2026-10-15', probability: 70, owner: 'Budi S.' },
 { id: 2, title: 'POS Upgrade 50 stores', company: 'Retail Maju', amount: 350000000, stage: 'Negotiation', expected_close: '2026-09-30', probability: 90, owner: 'Andi T.' },
 { id: 3, title: 'HRMS Cloud License', company: 'CV Sentosa', amount: 45000000, stage: 'New Lead', expected_close: '2026-11-01', probability: 30, owner: 'Siti M.' },
 { id: 4, title: 'Custom Accounting Module', company: 'Firma Hukum Z', amount: 85000000, stage: 'Qualified', expected_close: '2026-10-05', probability: 50, owner: 'Budi S.' },
]

export default function OpportunitiesPage() {
 const [searchTerm, setSearchTerm] = useState("")

 const filtered = MOCK_OPPS.filter(o => 
 o.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
 o.company.toLowerCase().includes(searchTerm.toLowerCase())
 )

 return (
 <div className="space-y-6 pb-10">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Opportunities</h1>
 <p className="text-muted-foreground mt-1">Manage and track potential sales deals.</p>
 </div>
 <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> New Opportunity</Button>
 </div>

 <Card className="shadow-sm">
 <CardHeader className="pb-4 border-b border-border/40">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <CardTitle className="text-[16px] font-semibold">All Opportunities</CardTitle>
 <div className="flex items-center gap-2">
 <div className="relative w-full sm:w-64">
 <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
 <Input 
 type="search" 
 placeholder="Search opportunities..." 
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
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Opportunity Name</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Customer</th>
 <th className="p-4 px-6 text-right text-[#526174] font-semibold text-[13px] tracking-wide">Expected Revenue</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Stage</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Probability</th>
 <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Owner</th>
 <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Action</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((item) => (
 <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer">
 <td className="py-3.5 px-6 font-semibold text-primary text-[13px] dark:text-primary">{item.title}</td>
 <td className="py-3.5 px-6 text-[13px]">{item.company}</td>
 <td className="p-4 px-6 text-right font-medium">Rp {item.amount.toLocaleString('id-ID')}</td>
 <td className="py-3.5 px-6 text-center text-[13px]">
 <Badge variant="secondary" className="bg-muted/50 text-foreground">{item.stage}</Badge>
 </td>
 <td className="py-3.5 px-6 text-center text-[13px]">
 <div className="flex items-center justify-center gap-2">
 <span className="w-8 text-right text-xs">{item.probability}%</span>
 <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
 <div 
 className={`h-full ${item.probability >= 70 ? 'bg-emerald-500' : item.probability >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
 style={{ width: `${item.probability}%` }}
 />
 </div>
 </div>
 </td>
 <td className="p-4 px-6 text-muted-foreground flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-indigo-100 text-primary flex items-center justify-center text-xs font-bold">
 {item.owner.charAt(0)}
 </div>
 {item.owner}
 </td>
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
