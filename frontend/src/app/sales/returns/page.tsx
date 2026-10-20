/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import { useEffect, useState } from 'react'
import { SalesReturnAPI } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SalesReturnsPage() {
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchReturns = async () => {
    try {
      const res = await SalesReturnAPI.list({ page: 1, limit: 100 })
      setData(res?.data || res || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReturns()
  }, [])

  const filtered = data.filter(d => 
    d.returnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.salesOrder?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'POSTED': return 'bg-green-100 text-green-800'
      case 'REVERSED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Sales Returns</h1>
          <p className="text-gray-500">Manage B2B sales returns</p>
        </div>
        <Link href="/sales/returns/create">
          <Button><Plus className="w-4 h-4 mr-2" /> New Return</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search return number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Return Number</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Sales Order</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Warehouse</th>
                  <th className="px-4 py-3 text-right font-medium">Return Value</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">No returns found</td>
                  </tr>
                ) : (
                  filtered.map(row => (
                    <tr 
                      key={row.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push('/sales/returns/' + row.id)}
                    >
                      <td className="px-4 py-3 font-medium text-blue-600">{row.returnNumber}</td>
                      <td className="px-4 py-3">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{row.salesOrder?.orderNumber}</td>
                      <td className="px-4 py-3">{row.customer?.name}</td>
                      <td className="px-4 py-3">{row.warehouse?.name}</td>
                      <td className="px-4 py-3 text-right">
                        Rp {(row.totalValue || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatusColor(row.status)} variant="outline">
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
