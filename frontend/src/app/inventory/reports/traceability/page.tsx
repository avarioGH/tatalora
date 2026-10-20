"use client"
import { useState, useEffect } from "react"
import { ReportsAPI, ExportAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"

export default function TraceabilityDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ReportsAPI.getTraceability().then((res: any) => {
      setData(res || {})
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 pb-10 p-4 md:p-8 dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Operational Dashboard</h1>
        <button 
          onClick={() => {
            window.open(ExportAPI.exportTraceability(''), '_blank');
          }}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        >
          Export XLSX
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-md flex items-start gap-3">
        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold mb-1">Important Note</h4>
          <p className="text-sm opacity-90">Stock is aggregated by Warehouse + Variant. Individual piece-level provenance is not available (Fungible Stock).</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0f172a] border-border text-white">
            <CardHeader>
              <CardTitle>Production Yield Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Output:</span>
                  <span className="font-medium">{data?.production?.totalOutput || 0} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Input Vol:</span>
                  <span className="font-medium">{data?.production?.totalInputVol || 0} m³</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-2 mt-2">
                  <span className="text-muted-foreground">Avg Yield:</span>
                  <span className="font-bold text-primary">{data?.production?.avgYield || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f172a] border-border text-white">
            <CardHeader>
              <CardTitle>Purchase Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Orders:</span>
                  <span className="font-medium">{data?.purchases?.totalOrders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items Received:</span>
                  <span className="font-medium">{data?.purchases?.itemsReceived || 0} pcs</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-2 mt-2">
                  <span className="text-muted-foreground">Pending Receipts:</span>
                  <span className="font-bold text-amber-500">{data?.purchases?.pendingReceipts || 0} pcs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f172a] border-border text-white">
            <CardHeader>
              <CardTitle>Shipment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Shipments:</span>
                  <span className="font-medium">{data?.shipments?.totalShipments || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items Shipped:</span>
                  <span className="font-medium">{data?.shipments?.itemsShipped || 0} pcs</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-2 mt-2">
                  <span className="text-muted-foreground">Pending Deliveries:</span>
                  <span className="font-bold text-amber-500">{data?.shipments?.pendingDeliveries || 0} pcs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
