"use client"
import { useState, useEffect } from "react"
import { TimberAPI, InventoryAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, Save, MapPin, Box, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"

export default function CreateTransferPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({ date: "", fromLocationId: "", toLocationId: "", notes: "" })
  const [items, setItems] = useState([{ timberVariantId: "", quantityPcs: "" }])

  useEffect(() => {
    InventoryAPI.getWarehouses()
      .then((res: any) => setWarehouses(Array.isArray(res) ? res : []))
      .catch(console.error).finally(() => setLoading(false))
  }, [])

  // Fetch available stock for selected source warehouse
  useEffect(() => {
    if (form.fromLocationId) {
      TimberAPI.getTimberStock({ locationId: form.fromLocationId })
        .then((res: any) => setStocks(res.items || []))
        .catch(console.error)
    } else {
      setStocks([])
    }
    // Reset items when source changes
    setItems([{ timberVariantId: "", quantityPcs: "" }])
  }, [form.fromLocationId])

  const getStock = (timberVariantId: string) => stocks.find(s => s.timberVariantId === timberVariantId)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    
    // Validation
    if (items.length === 0) {
      return toast({ title: "Error", description: "At least one item is required", variant: "destructive" })
    }
    
    let valid = true
    const payloadItems = items.map(item => {
      const selectedStock = getStock(item.timberVariantId)
      const qty = parseInt(item.quantityPcs) || 0
      
      if (!selectedStock || qty <= 0 || qty > selectedStock.currentPcs) {
        valid = false
      }
      
      let volumeM3 = 0
      if (selectedStock && selectedStock.currentPcs > 0) {
        const volRatio = qty / selectedStock.currentPcs
        volumeM3 = selectedStock.currentVolumeM3 * volRatio
      }
      
      return {
        timberVariantId: item.timberVariantId,
        quantityPcs: qty,
        volumeM3
      }
    })

    if (!valid) {
      return toast({ title: "Error", description: "Invalid SKU or insufficient stock quantity on one of the items.", variant: "destructive" })
    }
    
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        transferDate: form.date,
        items: payloadItems
      }
      await TimberAPI.createTransfer(payload)
      toast({ title: "Success", description: "Transfer created (DRAFT)" })
      router.push('/inventory/transfers')
    } catch (err: any) {
      toast({ title: "Error", description: (err.response?.data?.error?.message || err.response?.data?.message) || "Failed to create.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 md:p-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  }

  const availableVariants = (Array.isArray(stocks) ? stocks : []).filter(s => s.currentPcs > 0)

  return (
    <div className="space-y-4 md:space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-12 px-4 md:px-6 box-border">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Create Stock Transfer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Transfer physical inventory between warehouse locations.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Items Selection */}
            <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Box className="w-4 h-4 text-primary" /> Transfer Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-5 space-y-4">
                {!form.fromLocationId ? (
                  <div className="text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/10">
                    <MapPin className="w-8 h-8 mx-auto text-muted-foreground opacity-40 mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">Please select a Source Location first to view available stock.</p>
                  </div>
                ) : (
                  <>
                    {items.map((item, index) => {
                      const selectedStock = getStock(item.timberVariantId)
                      return (
                        <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end p-4 border border-border/60 bg-muted/5 rounded-lg relative group">
                          <div className="w-full sm:flex-1 space-y-2">
                            <Label className="text-[12px] uppercase text-muted-foreground font-bold tracking-wider">Timber SKU</Label>
                            <Select value={item.timberVariantId} onValueChange={(val: any) => {
                              const newItems = [...items]
                              newItems[index].timberVariantId = val || ""
                              setItems(newItems)
                            }}>
                              <SelectTrigger className="h-10 bg-background font-medium">
                                <SelectValue placeholder="Select available SKU..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableVariants.length === 0 ? (
                                  <SelectItem value="none" disabled>No stock available at source</SelectItem>
                                ) : (
                                  availableVariants.map(s => (
                                    <SelectItem key={s.timberVariantId} value={s.timberVariantId}>
                                      {s.timberVariant?.sku || s.timberVariantId} <span className="text-muted-foreground ml-1">({s.currentPcs} PCS)</span>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="w-full sm:w-32 space-y-2">
                            <Label className="text-[12px] uppercase text-muted-foreground font-bold tracking-wider">Transfer Qty</Label>
                            <Input 
                              required 
                              type="number" 
                              min="1" 
                              max={selectedStock?.currentPcs || 1}
                              className="h-10 bg-background font-semibold"
                              value={item.quantityPcs} 
                              onChange={(e) => {
                                const newItems = [...items]
                                newItems[index].quantityPcs = e.target.value
                                setItems(newItems)
                              }} 
                            />
                          </div>
                          
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="absolute top-2 right-2 sm:static sm:h-10 sm:w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => {
                              if (items.length > 1) {
                                setItems((Array.isArray(items) ? items : []).filter((_, i) => i !== index))
                              } else {
                                setItems([{ timberVariantId: "", quantityPcs: "" }])
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })}
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full border-dashed border-2 font-semibold h-11 text-muted-foreground hover:text-foreground"
                      onClick={() => setItems([...items, { timberVariantId: "", quantityPcs: "" }])}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Timber Variant
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            {/* Transfer Route Card */}
            <Card className="bg-card rounded-xl border border-border shadow-sm">
              <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Transfer Route
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[12px] uppercase text-muted-foreground font-bold tracking-wider">Transfer Date *</Label>
                  <Input required type="date" className="h-10 bg-background font-medium" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[12px] uppercase text-primary font-bold tracking-wider">FROM: Source Location *</Label>
                  <Select value={form.fromLocationId} onValueChange={(val: any) => setForm({...form, fromLocationId: val || ""})}>
                    <SelectTrigger className="h-10 bg-background font-medium border-primary/30 hover:border-primary/50">
                      <SelectValue placeholder="Select Source..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="pt-1 pb-1">
                  <div className="flex justify-center">
                    <div className="h-6 w-px bg-border/80"></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[12px] uppercase text-indigo-600 dark:text-indigo-400 font-bold tracking-wider">TO: Destination Location *</Label>
                  <Select value={form.toLocationId} onValueChange={(val: any) => setForm({...form, toLocationId: val || ""})}>
                    <SelectTrigger className="h-10 bg-background font-medium border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-300">
                      <SelectValue placeholder="Select Destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <Label className="text-[12px] uppercase text-muted-foreground font-bold tracking-wider">Notes</Label>
                  <Input placeholder="Optional reference or note" className="h-10 bg-background font-medium mt-1.5" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
              </CardContent>
            </Card>
            
            {/* Actions */}
            <Card className="bg-card rounded-xl border border-border shadow-sm">
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-col gap-3">
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 font-semibold h-11"
                    disabled={submitting || !form.fromLocationId || !form.toLocationId || form.fromLocationId === form.toLocationId || !items[0]?.timberVariantId || !items[0]?.quantityPcs}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Create Transfer
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-11 font-medium"
                    onClick={() => router.back()}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
