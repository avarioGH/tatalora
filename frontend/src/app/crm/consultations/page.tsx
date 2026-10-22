"use client"
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Filter, Users, UserPlus, UserCheck, Star, Archive, MessageCircle, ChevronDown, RefreshCw } from 'lucide-react'
import { ConsultationAPI } from '@/lib/api'

interface ConsultationLead {
  id: string
  name: string
  phone: string
  company_name: string
  position: string
  industry: string
  budget: string
  notes: string | null
  status: string
  source: string
  ip_address: string | null
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  byStatus: { status: string; _count: number }[]
  byIndustry: { industry: string; _count: number }[]
  byBudget: { budget: string; _count: number }[]
}

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED']

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'NEW':
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">New</Badge>
    case 'CONTACTED':
      return <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Contacted</Badge>
    case 'QUALIFIED':
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Qualified</Badge>
    case 'CONVERTED':
      return <Badge className="bg-purple-500 hover:bg-purple-600 text-white">Converted</Badge>
    case 'ARCHIVED':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-500">Archived</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

const getStatusCount = (stats: Stats | null, status: string): number => {
  if (!stats) return 0
  const found = stats.byStatus.find(s => s.status === status)
  return found ? found._count : 0
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const formatPhone = (phone: string): string => {
  // Strip leading 0 and prepend country code for wa.me link
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
  return cleaned
}

export default function ConsultationsPage() {
  const [leads, setLeads] = useState<ConsultationLead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [leadsData, statsData] = await Promise.all([
        ConsultationAPI.getAll(),
        ConsultationAPI.getStats(),
      ])
      setLeads(leadsData)
      setStats(statsData)
    } catch (e) {
      console.error('Failed to fetch consultation data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setUpdatingId(id)
      await ConsultationAPI.updateStatus(id, newStatus)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
      // Refresh stats
      const statsData = await ConsultationAPI.getStats()
      setStats(statsData)
      setOpenDropdownId(null)
    } catch (e) {
      console.error('Failed to update status', e)
    } finally {
      setUpdatingId(null)
    }
  }

  const openWhatsApp = (phone: string, name: string) => {
    const waPhone = formatPhone(phone)
    const message = encodeURIComponent(
      `Halo ${name}, terima kasih telah menghubungi TATALORA. Kami ingin menindaklanjuti konsultasi yang Anda ajukan. Apakah ada waktu yang nyaman untuk berdiskusi lebih lanjut?`
    )
    window.open(`https://wa.me/${waPhone}?text=${message}`, '_blank')
  }

  const filtered = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.industry.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Consultation Leads</h1>
          <p className="text-muted-foreground mt-1">Manage consultation requests from your website.</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All consultation requests</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">New</CardTitle>
            <UserPlus className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{loading ? '...' : getStatusCount(stats, 'NEW')}</div>
            <p className="text-xs text-muted-foreground">Awaiting contact</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <MessageCircle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{loading ? '...' : getStatusCount(stats, 'CONTACTED')}</div>
            <p className="text-xs text-muted-foreground">In follow-up</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{loading ? '...' : getStatusCount(stats, 'QUALIFIED')}</div>
            <p className="text-xs text-muted-foreground">Ready for proposal</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <Star className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{loading ? '...' : getStatusCount(stats, 'CONVERTED')}</div>
            <p className="text-xs text-muted-foreground">Became customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle className="text-[16px] font-semibold">All Consultation Leads</CardTitle>
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
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No consultation leads found</p>
              <p className="text-sm mt-1">Leads submitted via the website will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] md:min-w-full w-full text-sm">
                <thead className="bg-muted border-y border-border">
                  <tr>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Date</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Name</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Company</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Position</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Industry</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Budget</th>
                    <th className="p-4 px-6 text-left text-[#526174] font-semibold text-[13px] tracking-wide">Phone</th>
                    <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Status</th>
                    <th className="p-4 px-6 text-center text-[#526174] font-semibold text-[13px] tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="p-4 px-6 text-muted-foreground">
                        <div className="text-[13px]">{formatDate(lead.created_at)}</div>
                        <div className="text-xs text-muted-foreground/60">{formatTime(lead.created_at)}</div>
                      </td>
                      <td className="p-4 px-6 font-medium">
                        <div>{lead.name}</div>
                        {lead.notes && (
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate" title={lead.notes}>
                            {lead.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-[13px]">{lead.company_name}</td>
                      <td className="py-3.5 px-6 text-[13px] text-muted-foreground">{lead.position}</td>
                      <td className="py-3.5 px-6 text-[13px]">
                        <Badge variant="outline" className="font-normal">{lead.industry}</Badge>
                      </td>
                      <td className="py-3.5 px-6 text-[13px] font-medium">{lead.budget}</td>
                      <td className="py-3.5 px-6 text-[13px] text-muted-foreground">{lead.phone}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]">{getStatusBadge(lead.status)}</td>
                      <td className="py-3.5 px-6 text-center text-[13px]">
                        <div className="flex items-center justify-center gap-1">
                          {/* WhatsApp Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Open WhatsApp"
                            onClick={() => openWhatsApp(lead.phone, lead.name)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>

                          {/* Status Dropdown */}
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              disabled={updatingId === lead.id}
                              onClick={() => setOpenDropdownId(openDropdownId === lead.id ? null : lead.id)}
                            >
                              {updatingId === lead.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  Status <ChevronDown className="ml-1 h-3 w-3" />
                                </>
                              )}
                            </Button>
                            {openDropdownId === lead.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)} />
                                <div className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded-md shadow-md py-1 min-w-[130px]">
                                  {STATUS_OPTIONS.filter(s => s !== lead.status).map(status => (
                                    <button
                                      key={status}
                                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                                      onClick={() => handleStatusChange(lead.id, status)}
                                    >
                                      {status.charAt(0) + status.slice(1).toLowerCase()}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
