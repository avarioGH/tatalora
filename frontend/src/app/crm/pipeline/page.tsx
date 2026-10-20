"use client"
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, MoreHorizontal, User, DollarSign, Calendar } from 'lucide-react'

// Mock stages if API doesn't exist yet, but in a real app this would be fetched
const MOCK_STAGES = [
 { id: 'lead', name: 'New Leads', color: 'border-border bg-muted/50' },
 { id: 'qualified', name: 'Qualified', color: 'border-blue-200 bg-blue-50' },
 { id: 'proposal', name: 'Proposal Sent', color: 'border-amber-200 bg-amber-50' },
 { id: 'negotiation', name: 'Negotiation', color: 'border-purple-200 bg-purple-50' }
]

const MOCK_OPPS = [
 { id: 1, title: 'ERP Implementation', company: 'PT ABC Indonesia', amount: 150000000, stage: 'proposal', expected_close: '2026-10-15', probability: 70 },
 { id: 2, title: 'POS Upgrade 50 stores', company: 'Retail Maju', amount: 350000000, stage: 'negotiation', expected_close: '2026-09-30', probability: 90 },
 { id: 3, title: 'HRMS Cloud License', company: 'CV Sentosa', amount: 45000000, stage: 'lead', expected_close: '2026-11-01', probability: 30 },
 { id: 4, title: 'Custom Accounting Module', company: 'Firma Hukum Z', amount: 85000000, stage: 'qualified', expected_close: '2026-10-05', probability: 50 },
]

export default function PipelinePage() {
 const [opportunities] = useState<any[]>(MOCK_OPPS) // Would use API in real implementation

 return (
 <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Sales Pipeline</h1>
 <p className="text-[14px] text-muted-foreground mt-1">Track and manage your CRM opportunities across stages.</p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filters</Button>
 <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> New Opportunity</Button>
 </div>
 </div>

 <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
 <div className="flex gap-4 h-full min-w-max">
 {MOCK_STAGES.map(stage => {
 const stageOpps = opportunities.filter(o => o.stage === stage.id)
 const stageTotal = stageOpps.reduce((sum, o) => sum + o.amount, 0)
 
 return (
 <div key={stage.id} className="w-80 flex flex-col h-full">
 <div className={`p-3 rounded-t-md border-t-4 ${stage.color} border-x border-b border-b-transparent bg-muted/30`}>
 <div className="flex justify-between items-center mb-1">
 <h3 className="font-semibold text-sm">{stage.name}</h3>
 <Badge variant="secondary" className="bg-card">{stageOpps.length}</Badge>
 </div>
 <p className="text-xs text-muted-foreground font-medium">
 Rp {stageTotal.toLocaleString('id-ID')}
 </p>
 </div>
 
 <div className="flex-1 bg-muted/10 border-x border-b rounded-b-md p-2 space-y-3 overflow-y-auto">
 {stageOpps.length === 0 ? (
 <div className="h-20 flex items-center justify-center border-2 border-dashed border-muted/50 rounded-md">
 <p className="text-xs text-muted-foreground">No opportunities</p>
 </div>
 ) : (
 stageOpps.map(opp => (
 <Card key={opp.id} className="shadow-sm border-muted/60 hover:border-indigo-300 transition-colors cursor-pointer group">
 <CardContent className="p-3">
 <div className="flex justify-between items-start mb-2">
 <p className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">{opp.title}</p>
 <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-3 w-3" /></Button>
 </div>
 
 <div className="space-y-2 mt-3">
 <div className="flex items-center text-xs text-muted-foreground">
 <User className="h-3 w-3 mr-1.5" />
 <span className="truncate">{opp.company}</span>
 </div>
 <div className="flex justify-between items-center text-xs">
 <span className="flex items-center font-medium text-primary dark:text-primary">
 Rp {(opp.amount / 1000000).toFixed(1)}M
 </span>
 <span className="flex items-center text-muted-foreground">
 <Calendar className="h-3 w-3 mr-1" />
 {new Date(opp.expected_close).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
 </span>
 </div>
 </div>
 
 <div className="mt-3 bg-muted/50 rounded-full h-1.5 w-full overflow-hidden">
 <div 
 className={`h-full ${opp.probability >= 70 ? 'bg-emerald-500' : opp.probability >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`} 
 style={{ width: `${opp.probability}%` }}
 />
 </div>
 </CardContent>
 </Card>
 ))
 )}
 </div>
 </div>
 )
 })}
 
 <div className="w-80 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/5">
 <Button variant="ghost" className="text-muted-foreground"><Plus className="w-4 h-4 mr-2" /> Add Stage</Button>
 </div>
 </div>
 </div>
 </div>
 )
}
