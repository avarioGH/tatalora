import os

base_path = 'src/app/sales/returns'

page_list = '''/* eslint-disable @typescript-eslint/no-explicit-any */
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
'''

page_create = '''/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SalesReturnAPI, B2BApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, ArrowLeft, Info } from 'lucide-react'
import { toast } from 'sonner'

export default function CreateReturnPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState("")
  const [orderDetails, setOrderDetails] = useState<any>(null)
  
  const [returnItems, setReturnItems] = useState<any[]>([])
  const [reason, setReason] = useState("")

  const fetchOrders = async () => {
    try {
      const res = await B2BApi.getOrders({ status: 'COMPLETED' })
      setOrders(res?.data || res || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrderDetails = async (orderId: string) => {
    if (!orderId) {
      setOrderDetails(null)
      setReturnItems([])
      return
    }
    try {
      setLoading(true)
      const res = await B2BApi.getOrder(orderId)
      const order = res?.data || res
      setOrderDetails(order)
      
      const items = (order.items || []).map((item: any) => ({
        salesOrderItemId: item.id,
        productId: item.productId,
        product: item.product,
        deliveredQty: item.deliveredQty || item.quantity || 0,
        returnedQty: item.returnedQty || 0,
        price: item.price,
        returnQty: 0
      }))
      setReturnItems(items)
    } catch (e) {
      console.error(e)
      toast.error("Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  const handleQtyChange = (index: number, val: number) => {
    const newItems = [...returnItems]
    const item = newItems[index]
    const maxQty = item.deliveredQty - item.returnedQty
    
    let validVal = val
    if (val > maxQty) validVal = maxQty
    if (val < 0) validVal = 0
    
    newItems[index].returnQty = validVal
    setReturnItems(newItems)
  }

  const handleSubmit = async () => {
    const itemsToReturn = returnItems.filter(i => i.returnQty > 0).map(i => ({
      salesOrderItemId: i.salesOrderItemId,
      returnQty: i.returnQty
    }))

    if (itemsToReturn.length === 0) {
      toast.error("Please enter return quantity for at least one item")
      return
    }

    try {
      setLoading(true)
      await SalesReturnAPI.create({
        salesOrderId: selectedOrderId,
        reason,
        items: itemsToReturn
      })
      toast.success("Sales Return created successfully")
      router.push('/sales/returns')
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create return")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Sales Return</h1>
          <p className="text-gray-500">Return items from B2B Sales Order</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-md flex items-start">
            <Info className="w-5 h-5 mr-3 mt-0.5" />
            <div>
              <p className="font-medium">HPP akan dikembalikan berdasarkan biaya historis saat retur diposting.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Sales Order</label>
              <select 
                className="w-full border rounded-md p-2"
                value={selectedOrderId}
                onChange={(e) => {
                  setSelectedOrderId(e.target.value)
                  fetchOrderDetails(e.target.value)
                }}
              >
                <option value="">-- Select Order --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>{o.orderNumber} - {o.customer?.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <Input 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                placeholder="Return reason..."
              />
            </div>
          </div>

          {orderDetails && (
            <div className="mt-6 border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-right font-medium">Delivered Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Returned Qty</th>
                    <th className="px-4 py-3 text-right font-medium">Max Return</th>
                    <th className="px-4 py-3 text-right font-medium">Return Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {returnItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3">{item.product?.name || item.product?.code || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right">{item.deliveredQty}</td>
                      <td className="px-4 py-3 text-right">{item.returnedQty}</td>
                      <td className="px-4 py-3 text-right">{item.deliveredQty - item.returnedQty}</td>
                      <td className="px-4 py-3 text-right">
                        <Input 
                          type="number"
                          min={0}
                          max={item.deliveredQty - item.returnedQty}
                          value={item.returnQty}
                          onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                          className="w-24 ml-auto text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={loading || !selectedOrderId}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Return
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'''

page_detail = '''/* eslint-disable @typescript-eslint/no-explicit-any */
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
      toast.error(e.response?.data?.message || "Failed to reverse return")
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
    </div>
  )
}
'''

with open(os.path.join(base_path, 'page.tsx'), 'w', encoding='utf-8') as f:
    f.write(page_list)

with open(os.path.join(base_path, 'create/page.tsx'), 'w', encoding='utf-8') as f:
    f.write(page_create)

with open(os.path.join(base_path, '[id]/page.tsx'), 'w', encoding='utf-8') as f:
    f.write(page_detail)

print("Files generated successfully!")
