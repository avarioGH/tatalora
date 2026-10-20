"use client"
import { useState, useEffect } from "react"
import { ReportsAPI, InventoryAPI, ExportAPI, TimberAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package2, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function StockCardPage() {
  const router = useRouter()
  const [data, setData] = useState<{openingBalance: number, movements: any[]}>({ openingBalance: 0, movements: [] })
  const [loading, setLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [stockData, setStockData] = useState<any[]>([])
  const [loadingStock, setLoadingStock] = useState(true)
  
  const [filters, setFilters] = useState({
    warehouseId: "",
    variant: "",
    dateFrom: "",
    dateTo: "",
  })

  useEffect(() => {
    InventoryAPI.getWarehouses().then((res: any) => {
      setWarehouses(Array.isArray(res) ? res : res.data || [])
    }).catch(console.error)

    TimberAPI.getTimberStock().then((res: any) => {
      setStockData(res.items || [])
    }).catch(console.error).finally(() => setLoadingStock(false))
  }, [])

  const fetchData = async () => {
    if (!filters.warehouseId || !filters.variant) return;
    setLoading(true)
    try {
      const res = await ReportsAPI.getStockCard(filters)
      setData(res || { openingBalance: 0, movements: [] })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Pivot data: group by variant
  const pivotData: Record<string, any> = {};
  stockData.forEach(item => {
    const sku = item.timberVariant?.sku || "Unknown";
    if (!pivotData[sku]) {
      pivotData[sku] = {
        variantId: item.timberVariantId,
        sku: sku,
        species: item.timberVariant?.species || "-",
        thickness: item.timberVariant?.thickness || 0,
        width: item.timberVariant?.width || 0,
        length: item.timberVariant?.length || 0,
        totalPcs: 0,
        totalM3: 0,
        warehouses: {} // locationId -> pcs
      };
    }
    const locName = item.location?.name || "Unknown";
    pivotData[sku].warehouses[locName] = (pivotData[sku].warehouses[locName] || 0) + item.currentPcs;
    pivotData[sku].totalPcs += item.currentPcs;
    pivotData[sku].totalM3 += (item.currentVolumeM3 || 0);
  });
  
  const pivotRows = Object.values(pivotData);
  const allWarehouseNames = Array.from(new Set(stockData.map(item => item.location?.name || "Unknown"))).sort();

  return (
    <div className="space-y-6 pb-10 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center gap-2">
          <Package2 className="w-8 h-8 text-primary" /> Laporan Stok & Kartu Stok
        </h1>
        <p className="text-muted-foreground">Lihat ringkasan stok per gudang atau cari kartu stok spesifik.</p>
      </div>

      <Card className="shadow-sm border-border mb-8">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <CardTitle className="text-lg">Ringkasan Stok Saat Ini</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingStock ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : pivotRows.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Belum ada data stok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="p-4 text-left font-semibold">SKU / Produk</th>
                    <th className="p-4 text-center font-semibold">Dimensi (mm)</th>
                    <th className="p-4 text-right font-bold text-primary">Total Stok (PCS)</th>
                    {allWarehouseNames.map(w => (
                      <th key={w} className="p-4 text-right font-semibold text-muted-foreground">{w}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pivotRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{row.sku}</div>
                        <div className="text-xs text-muted-foreground">{row.species}</div>
                      </td>
                      <td className="p-4 text-center text-muted-foreground">
                        {row.thickness} &times; {row.width} &times; {row.length}
                      </td>
                      <td className="p-4 text-right font-bold text-primary bg-primary/5">
                        {row.totalPcs} Pcs <br/>
                        <span className="text-xs font-normal text-muted-foreground">{row.totalM3.toFixed(4)} M&sup3;</span>
                      </td>
                      {allWarehouseNames.map(w => (
                        <td key={w} className="p-4 text-right">
                          {row.warehouses[w] ? (
                            <Badge variant="outline" className="font-bold text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
                              {row.warehouses[w]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <CardTitle className="text-lg">Pencarian Kartu Stok (Riwayat Masuk/Keluar)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <select 
              className="bg-background text-foreground border border-input p-2 rounded-md min-w-[200px]"
              value={filters.warehouseId}
              onChange={(e) => setFilters({...filters, warehouseId: e.target.value})}
            >
              <option value="">-- Pilih Gudang --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            
            <select 
              className="bg-background text-foreground border border-input p-2 rounded-md min-w-[200px]"
              value={filters.variant}
              onChange={(e) => setFilters({...filters, variant: e.target.value})}
            >
              <option value="">-- Pilih Produk/SKU --</option>
              {pivotRows.map(r => (
                <option key={r.variantId} value={r.sku}>{r.sku}</option>
              ))}
            </select>

            <input 
              type="date" 
              className="bg-background text-foreground border border-input p-2 rounded-md"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            />

            <input 
              type="date" 
              className="bg-background text-foreground border border-input p-2 rounded-md"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            />

            <button 
              onClick={fetchData}
              disabled={!filters.warehouseId || !filters.variant || loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 flex items-center font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Cari Kartu Stok
            </button>

            <button 
              onClick={() => {
                const query = new URLSearchParams(filters as any).toString();
                window.open(ExportAPI.exportStockCard(query), '_blank');
              }}
              disabled={!filters.warehouseId || !filters.variant}
              className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50 font-semibold"
            >
              Export Excel
            </button>
          </div>

          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="p-4 text-left font-semibold">Tanggal</th>
                  <th className="p-4 text-left font-semibold">No. Dokumen</th>
                  <th className="p-4 text-left font-semibold">Tipe</th>
                  <th className="p-4 text-center font-bold text-emerald-600">IN</th>
                  <th className="p-4 text-center font-bold text-rose-600">OUT</th>
                  <th className="p-4 text-right font-bold text-primary">Saldo (Balance)</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-12 text-muted-foreground">Pilih Gudang dan SKU lalu klik Cari Kartu Stok.</td></tr>
                ) : (() => {
                  let runningBalance = data.openingBalance || 0;
                  return [
                    <tr key="opening" className="bg-muted/10 border-b">
                      <td colSpan={5} className="p-4 font-semibold text-right text-muted-foreground">Opening Balance</td>
                      <td className="p-4 text-right font-bold">{runningBalance}</td>
                    </tr>,
                    ...data.movements.map((m, i) => {
                      const isIn = m.type === 'IN' || (m.type === 'ADJ' && m.quantityPcs > 0);
                      const isOut = m.type === 'OUT' || (m.type === 'ADJ' && m.quantityPcs < 0);
                      const qty = Math.abs(m.quantityPcs || m.quantity || 0);
                      
                      if (isIn) runningBalance += qty;
                      if (isOut) runningBalance -= qty;

                      return (
                        <tr key={m.id || i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="p-4">{new Date(m.date || m.created_at || Date.now()).toLocaleDateString('id-ID')}</td>
                          <td className="p-4 font-medium">{m.documentRef || m.reference || '-'}</td>
                          <td className="p-4"><Badge variant="outline">{m.type || m.referenceType}</Badge></td>
                          <td className="p-4 text-center font-semibold text-emerald-600">{isIn ? `+${qty}` : '-'}</td>
                          <td className="p-4 text-center font-semibold text-rose-600">{isOut ? `-${qty}` : '-'}</td>
                          <td className="p-4 text-right font-bold text-primary">{runningBalance}</td>
                        </tr>
                      )
                    })
                  ]
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
