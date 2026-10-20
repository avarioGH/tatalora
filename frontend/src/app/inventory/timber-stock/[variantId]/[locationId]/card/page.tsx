"use client"
import { useEffect, useState } from 'react'
import { TimberAPI } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Printer, Box, MapPin, Package2, Ruler, Activity } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

export default function StockCardPage() {
  const { variantId, locationId } = useParams() as { variantId: string, locationId: string }
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    TimberAPI.getStockCard(variantId, locationId).then((res: any) => {
      setData(res)
      setLoading(false)
    }).catch((err: any) => {
      console.error(err)
      setLoading(false)
    })
  }, [variantId, locationId])

  if (loading) {
    return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  }

  if (!data || !data.stock) {
    return (
      <div className="p-8 md:p-24 flex flex-col items-center justify-center text-center animate-in fade-in">
        <Package2 className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Stock Card Not Found</h2>
        <p className="text-muted-foreground max-w-md mb-6 text-[15px]">Data pergerakan stock kayu tidak ditemukan atau parameter tidak valid.</p>
        <Button onClick={() => router.push('/inventory/timber-stock')} variant="outline" className="h-10 px-6 font-semibold">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Timber Stock
        </Button>
      </div>
    )
  }

  const { stock, card } = data

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-8 px-4 md:px-6 box-border">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/inventory/timber-stock')} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Stock Card
              </h1>
              <span className="inline-flex items-center rounded-sm bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wider">LEDGER</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Movement History & Balance
            </p>
          </div>
        </div>
        
        <Button onClick={() => window.print()} className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-sm font-semibold h-10">
          <Printer className="w-4 h-4 mr-2" /> Print Card
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Variant Info */}
        <Card className="bg-card rounded-xl border border-border shadow-sm md:col-span-2">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" /> TIMBER VARIANT
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-5 grid grid-cols-2 gap-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">SKU</p>
              <p className="font-bold text-foreground/90 text-[15px]">{stock.timberVariant?.sku || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Location</p>
              <p className="font-semibold text-foreground/90 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-muted-foreground"/> {stock.location?.name || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Product / Species</p>
              <p className="font-semibold text-foreground/90">{stock.timberVariant?.product?.name || stock.timberVariant?.species || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Dimensions (mm)</p>
              <p className="font-semibold text-foreground/90 flex items-center gap-1.5"><Ruler className="w-3.5 h-3.5 text-muted-foreground" /> {stock.timberVariant?.thickness || 0} &times; {stock.timberVariant?.width || 0} &times; {stock.timberVariant?.length || 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* Balance Info */}
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Package2 className="w-4 h-4" /> CURRENT BALANCE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[120px]">
            <span className="text-4xl font-black tracking-tight text-foreground/90">{stock.currentPcs}</span>
            <span className="text-[11px] font-bold text-muted-foreground mt-1.5 uppercase tracking-wider">TOTAL PCS</span>
            
            <div className="mt-4 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-[13px] font-bold text-primary">{stock.currentVolumeM3 > 0 ? stock.currentVolumeM3.toFixed(4) : "0.0000"} M³</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" /> MOVEMENT HISTORY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {card && card.length > 0 ? (
              <div className="overflow-x-auto w-full sm:max-w-none">
                <table className="min-w-[800px] md:min-w-full w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Date</th>
                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Reference</th>
                      <th className="p-4 px-6 text-left font-semibold text-muted-foreground h-11">Type</th>
                      <th className="p-4 px-6 text-right font-semibold text-emerald-700 h-11">IN (PCS)</th>
                      <th className="p-4 px-6 text-right font-semibold text-rose-700 h-11">OUT (PCS)</th>
                      <th className="p-4 px-6 text-right font-semibold text-foreground h-11 bg-muted/20">BALANCE (PCS)</th>
                      <th className="p-4 px-6 text-right font-semibold text-foreground h-11 bg-muted/20">BALANCE (M³)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.map((row: any, idx: number) => (
                      <tr key={row.id || idx} className={`border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors ${row.reference === 'OPENING' ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                        <td className="py-3 px-6 text-[13px] text-muted-foreground">
                          {row.date ? new Date(row.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-3 px-6 font-mono text-[13px] font-semibold text-foreground/80">{row.reference || "-"}</td>
                        <td className="py-3 px-6 text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{row.type || "-"}</td>
                        <td className="py-3 px-6 text-right font-semibold text-emerald-600 dark:text-emerald-500">
                          {row.in > 0 ? `+${row.in}` : '-'}
                        </td>
                        <td className="py-3 px-6 text-right font-semibold text-rose-600 dark:text-rose-500">
                          {row.out > 0 ? `-${row.out}` : '-'}
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-foreground/90 bg-muted/10">
                          {row.balancePcs || 0}
                        </td>
                        <td className="py-3 px-6 text-right font-bold text-primary bg-muted/10">
                          {(row.balanceM3 || 0).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">No movement history found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
