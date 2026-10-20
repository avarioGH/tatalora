"use client"
import { useState, useEffect } from "react"
import { ReportsAPI, InventoryAPI, ExportAPI } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from "lucide-react"

export default function StockMovementExplorer() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<any[]>([])
  
  const [filters, setFilters] = useState({
    warehouseId: "",
    variant: "",
    type: "",
    dateFrom: "",
    dateTo: "",
    page: 1
  })

  useEffect(() => {
    InventoryAPI.getWarehouses().then((res: any) => {
      setWarehouses(Array.isArray(res) ? res : res.data || [])
    }).catch(console.error)
  }, [])

  useEffect(() => {
    fetchData()
  }, [filters])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await ReportsAPI.getMovements(filters)
      const items = res?.data || res?.items || (Array.isArray(res) ? res : [])
      setData(Array.isArray(items) ? items : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-10 p-4 md:p-8 dark">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-6">Stock Movement Explorer</h1>
      </div>

      <div className="flex gap-4 mb-4 items-center">
        <select 
          className="bg-[#0f172a] text-white border border-border p-2 rounded"
          value={filters.warehouseId}
          onChange={(e) => setFilters({...filters, warehouseId: e.target.value, page: 1})}
        >
          <option value="">All Warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        
        <input 
          type="text" 
          placeholder="Variant SKU..." 
          className="bg-[#0f172a] text-white border border-border p-2 rounded"
          value={filters.variant}
          onChange={(e) => setFilters({...filters, variant: e.target.value, page: 1})}
        />

        <input 
          type="date" 
          className="bg-[#0f172a] text-white border border-border p-2 rounded"
          value={filters.dateFrom}
          onChange={(e) => setFilters({...filters, dateFrom: e.target.value, page: 1})}
          title="Date From"
        />
        
        <input 
          type="date" 
          className="bg-[#0f172a] text-white border border-border p-2 rounded"
          value={filters.dateTo}
          onChange={(e) => setFilters({...filters, dateTo: e.target.value, page: 1})}
          title="Date To"
        />

        <select 
          className="bg-[#0f172a] text-white border border-border p-2 rounded"
          value={filters.type}
          onChange={(e) => setFilters({...filters, type: e.target.value, page: 1})}
        >
          <option value="">All Types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
          <option value="ADJ">ADJ</option>
        </select>

        <button 
          onClick={() => {
            const query = new URLSearchParams(filters as any).toString();
            window.open(ExportAPI.exportMovements(query), '_blank');
          }}
          className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        >
          Export XLSX
        </button>
      </div>

      <Card className="shadow-sm bg-[#0f172a] border-border text-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[600px] md:min-w-full w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="p-4 px-6 text-left font-bold">Date</th>
                    <th className="p-4 px-6 text-left font-bold">Variant</th>
                    <th className="p-4 px-6 text-left font-bold">Type</th>
                    <th className="p-4 px-6 text-center font-bold">In</th>
                    <th className="p-4 px-6 text-center font-bold">Out</th>
                    <th className="p-4 px-6 text-right font-bold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-12 text-muted-foreground">No movements found.</td></tr>
                  ) : data.map((m, i) => {
                    const isIn = m.type === 'IN' || (m.type === 'ADJ' && m.quantityPcs > 0);
                    const isOut = m.type === 'OUT' || (m.type === 'ADJ' && m.quantityPcs < 0);
                    const qty = Math.abs(m.quantityPcs || m.quantity || 0);
                    const productName = m.timberStock?.timberVariant?.sku || m.product?.name || m.variant || 'Unknown';
                    const balance = m.timberStock?.currentPcs || m.balance || 0;

                    return (
                      <tr key={m.id || i} className="border-b border-border/50 hover:bg-slate-800/20">
                        <td className="p-4 px-6 text-slate-300">{new Date(m.date || m.created_at || Date.now()).toLocaleDateString('id-ID')}</td>
                        <td className="p-4 px-6 font-medium text-slate-200">{productName}</td>
                        <td className="py-3.5 px-6 text-[13px]"><Badge variant="outline">{m.type || m.referenceType}</Badge></td>
                        <td className="p-4 px-6 text-center text-primary font-medium">{isIn ? qty : '-'}</td>
                        <td className="p-4 px-6 text-center text-red-400 font-medium">{isOut ? qty : '-'}</td>
                        <td className="p-4 px-6 text-right font-bold text-slate-200">{balance}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center mt-4">
        <button 
          disabled={filters.page === 1}
          onClick={() => setFilters({...filters, page: Math.max(1, filters.page - 1)})}
          className="px-4 py-2 bg-slate-800 text-white rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-white">Page {filters.page}</span>
        <button 
          onClick={() => setFilters({...filters, page: filters.page + 1})}
          className="px-4 py-2 bg-slate-800 text-white rounded"
        >
          Next
        </button>
      </div>
    </div>
  )
}
