/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
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
