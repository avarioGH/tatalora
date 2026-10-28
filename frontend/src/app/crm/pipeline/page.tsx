"use client"
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, MoreHorizontal, User, DollarSign, Calendar, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'

const STAGES = [
  { id: 'lead', name: 'New Leads', color: 'border-border bg-muted/50' },
  { id: 'qualified', name: 'Qualified', color: 'border-blue-200 bg-blue-50' },
  { id: 'proposal', name: 'Proposal Sent', color: 'border-amber-200 bg-amber-50' },
  { id: 'negotiation', name: 'Negotiation', color: 'border-purple-200 bg-purple-50' }
]

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPipeline()
  }, [])

  const fetchPipeline = async () => {
    setLoading(true)
    try {
      const res = await api.get('/crm/opportunities').catch(() => ({ data: [] }))
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || [])
      setOpportunities(list)
    } catch (err) {
      console.error("Error loading pipeline:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Sales Pipeline</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Track and manage your CRM opportunities across stages in real-time.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filters</Button>
          <Button className="shadow-sm"><Plus className="w-4 h-4 mr-2" /> New Opportunity</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Memuat pipeline penjualan...
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map(stage => {
              const stageOpps = opportunities.filter(o => (o.stage || 'lead').toLowerCase().includes(stage.id))
              const stageTotal = stageOpps.reduce((sum, o) => sum + (Number(o.amount) || Number(o.expected_revenue) || 0), 0)
              
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
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-muted/50 rounded-md">
                        <p className="text-xs text-muted-foreground">Tidak ada peluang di tahap ini</p>
                      </div>
                    ) : (
                      stageOpps.map(opp => {
                        const amt = Number(opp.amount) || Number(opp.expected_revenue) || 0
                        const prob = Number(opp.probability) || 50
                        const cName = opp.customer?.name || opp.company || 'Pelanggan'
                        const closeDate = opp.expected_close || opp.expected_close_date || opp.created_at

                        return (
                          <Card key={opp.id} className="shadow-sm border-muted/60 hover:border-indigo-300 transition-colors cursor-pointer group bg-card">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">{opp.title}</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-3 w-3" /></Button>
                              </div>
                              
                              <div className="space-y-2 mt-3">
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <User className="h-3 w-3 mr-1.5" />
                                  <span className="truncate">{cName}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="flex items-center font-medium text-primary">
                                    Rp {(amt / 1000000).toFixed(1)}M
                                  </span>
                                  <span className="flex items-center text-muted-foreground">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {closeDate ? new Date(closeDate).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : '-'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-3 bg-muted/50 rounded-full h-1.5 w-full overflow-hidden">
                                <div 
                                  className={`h-full ${prob >= 70 ? 'bg-emerald-500' : prob >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`} 
                                  style={{ width: `${prob}%` }}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
