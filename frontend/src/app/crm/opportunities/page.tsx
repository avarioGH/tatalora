"use client"
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, Search, ChevronRight, User, Loader2, FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

export default function OpportunitiesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOpportunities()
  }, [])

  const fetchOpportunities = async () => {
    setLoading(true)
    try {
      const res = await api.get('/crm/opportunities').catch(() => ({ data: [] }))
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || [])
      setOpportunities(list)
    } catch (err) {
      console.error("Error loading opportunities:", err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = opportunities.filter(o => 
    (o.title && o.title.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (o.company && o.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (o.customer?.name && o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat data peluang penjualan dari database...
              </div>
            ) : (
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-muted-foreground">
                        <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-base font-medium">Belum ada peluang bisnis yang tercatat.</p>
                        <p className="text-xs text-muted-foreground mt-1">Tambahkan deal baru untuk mulai memantau pipeline penjualan.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => {
                      const amount = Number(item.amount) || Number(item.expected_revenue) || 0
                      const prob = Number(item.probability) || 50
                      const ownerName = item.owner?.name || item.owner || 'Sales'
                      return (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer">
                          <td className="py-3.5 px-6 font-semibold text-primary text-[13px] dark:text-primary">{item.title}</td>
                          <td className="py-3.5 px-6 text-[13px]">{item.customer?.name || item.company || '-'}</td>
                          <td className="p-4 px-6 text-right font-medium">Rp {amount.toLocaleString('id-ID')}</td>
                          <td className="py-3.5 px-6 text-center text-[13px]">
                            <Badge variant="secondary" className="bg-muted/50 text-foreground">{item.stage || 'New Lead'}</Badge>
                          </td>
                          <td className="py-3.5 px-6 text-center text-[13px]">
                            <div className="flex items-center justify-center gap-2">
                              <span className="w-8 text-right text-xs">{prob}%</span>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${prob >= 70 ? 'bg-emerald-500' : prob >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                  style={{ width: `${prob}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 px-6 text-muted-foreground flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-primary flex items-center justify-center text-xs font-bold">
                              {ownerName.charAt(0)}
                            </div>
                            {ownerName}
                          </td>
                          <td className="py-3.5 px-6 text-center text-[13px]">
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              View <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
