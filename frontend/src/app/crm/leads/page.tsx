"use client"
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, Search, ChevronRight, Loader2, FolderOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await api.get('/crm/leads').catch(() => ({ data: [] }))
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || [])
      setLeads(list)
    } catch (err) {
      console.error("Error loading leads:", err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = leads.filter(o => 
    (o.name && o.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (o.company && o.company.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'New': return <Badge variant="secondary" className="bg-blue-50 text-blue-700">New</Badge>
      case 'Contacted': return <Badge variant="outline" className="text-amber-600 border-amber-200">Contacted</Badge>
      case 'Qualified': return <Badge className="bg-emerald-500">Qualified</Badge>
      default: return <Badge variant="outline">{status || 'New'}</Badge>
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
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat data leads dari database...
              </div>
            ) : (
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-muted-foreground">
                        <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-base font-medium">Belum ada data leads di database.</p>
                        <p className="text-xs text-muted-foreground mt-1">Gunakan tombol New Lead untuk menambahkan prospek baru.</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer">
                        <td className="p-4 px-6 font-medium">{item.name}</td>
                        <td className="py-3.5 px-6 text-[13px]">{item.company || '-'}</td>
                        <td className="p-4 px-6 text-muted-foreground">
                          <div>{item.email || '-'}</div>
                          <div className="text-xs">{item.phone || '-'}</div>
                        </td>
                        <td className="p-4 px-6 text-muted-foreground">{item.source || '-'}</td>
                        <td className="py-3.5 px-6 text-center text-[13px]">{getStatusBadge(item.status)}</td>
                        <td className="py-3.5 px-6 text-center text-[13px]">
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            View <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
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
