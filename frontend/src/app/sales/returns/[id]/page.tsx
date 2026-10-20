/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SalesReturnAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, CheckCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

export default function ReturnDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true)
        const res = await SalesReturnAPI.detail(id)
        setData(res?.data || res)
      } catch (e) {
        console.error(e)
        toast.error("Failed to load details")
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchDetail()
  }, [id])

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this return?")) return
    try {
      setActionLoading(true)
      await SalesReturnAPI.approve(id)
      toast.success("Return approved and posted")
      window.location.reload()
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to approve return")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReverse = async () => {
    if (!confirm("Are you sure you want to reverse this return?")) return
    try {
      setActionLoading(true)
      await SalesReturnAPI.reverse(id)
      toast.success("Return reversed")
      window.location.reload()
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.response?.data?.message || "Failed to reverse return"
      toast.error(errorMsg)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  if (!data) return <div className="p-8 text-center text-gray-500">Return not found</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{data.returnNumber}</h1>
            <p className="text-gray-500">Sales Return from SO {data.salesOrder?.orderNumber}</p>
          </div>
          <Badge className={
            data.status === 'POSTED' ? 'bg-green-100 text-green-800' : 
            data.status === 'REVERSED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
          }>
            {data.status}
          </Badge>
        </div>
        <div className="flex space-x-2">
          {data.status === 'DRAFT' && (
            <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve (Post)
            </Button>
          )}
          {data.status === 'POSTED' && (
            <Button onClick={handleReverse} disabled={actionLoading} variant="destructive">
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Reverse
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Return Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-3">
              <span className="text-gray-500">Date</span>
              <span className="col-span-2 font-medium">{new Date(data.date).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-gray-500">Reason</span>
              <span className="col-span-2 font-medium">{data.reason || '-'}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-gray-500">Warehouse</span>
              <span className="col-span-2 font-medium">{data.warehouse?.name}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-3">
              <span className="text-gray-500">Name</span>
              <span className="col-span-2 font-medium">{data.customer?.name}</span>
            </div>
            <div className="grid grid-cols-3">
              <span className="text-gray-500">Sales Order</span>
              <span className="col-span-2 font-medium">{data.salesOrder?.orderNumber}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Return Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Return Qty</th>
                <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data.items || []).map((item: any) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.product?.name || item.product?.code}</td>
                  <td className="px-4 py-3 text-right">{item.returnQty}</td>
                  <td className="px-4 py-3 text-right">Rp {(item.price || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    Rp {((item.price || 0) * (item.returnQty || 0)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold border-t">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">Total Return Value</td>
                <td className="px-4 py-3 text-right text-blue-600">
                  Rp {(data.totalValue || 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {data.items?.some((item: any) => (item.costAllocations?.length > 0 || item.cost_allocations?.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Traceability</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Original Layer ID</th>
                  <th className="px-4 py-3 text-right font-medium">Allocated Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((item: any) => {
                  const allocs = item.costAllocations || item.cost_allocations || [];
                  return allocs.map((alloc: any) => (
                    <tr key={alloc.id}>
                      <td className="px-4 py-3">{item.product?.name || item.product?.code}</td>
                      <td className="px-4 py-3">{alloc.originalLayerId}</td>
                      <td className="px-4 py-3 text-right">{alloc.quantity}</td>
                      <td className="px-4 py-3 text-right">Rp {(alloc.unitCost || 0).toLocaleString()}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
