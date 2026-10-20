"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { api, MasterDataAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, X, ArrowLeft } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


  const calculateLogVolume = (length: number, d1: number, d2: number) => {
    if (!length || !d1 || !d2) return 0;
    const avg = (d1 + d2) / 2;
    const rnd = Math.floor(avg);
    return (rnd * rnd * 0.7854 / 10000) * length;
  };


const SearchableSelect = ({ value, onChange, options, placeholder, onAdd }: any) => {
  const [open, setOpen] = useState(false)
  const selected = options.find((o: any) => o.value === value)

  return (
    <div className="flex gap-2 w-full">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-10 flex-1 justify-between items-center px-3 py-2 bg-background border border-input rounded-md text-sm font-normal hover:bg-accent hover:text-accent-foreground">
          {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder={"Cari..."} />
          <CommandList>
            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {options.map((option: any) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {onAdd && (
      <Button type="button" variant="outline" onClick={onAdd} title="Tambah Baru" className="px-3"><Plus className="w-4 h-4" /></Button>
    )}
    </div>
  )
}

export default function EditPurchasePage() {
  const params = useParams();
  const isEdit = true;
  const purchaseId = params?.id as string;

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sources, setSources] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [variants, setVariants] = useState<any[]>([])
  const [speciesList, setSpeciesList] = useState<any[]>([])
  const [error, setError] = useState("")
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
  const [newVariant, setNewVariant] = useState({ species: "", grade: "", thickness: "", width: "", length: "" })
  const [creatingVariant, setCreatingVariant] = useState(false)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState("")
  const [creatingSupplier, setCreatingSupplier] = useState(false)

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplierName) return;
    setCreatingSupplier(true)
    try {
      const res = await api.post('/inventory/master-data/timber-source', { name: newSupplierName, code: "SUP-" + Math.floor(Math.random() * 10000), type: "SUPPLIER" })
      setSources([res.data, ...sources])
      setForm({...form, sourceId: res.data.id})
      setIsSupplierModalOpen(false)
      setNewSupplierName("")
    } catch (err: any) {
      console.error(err)
    } finally {
      setCreatingSupplier(false)
    }
  }

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingVariant(true)
    try {
      const res = await MasterDataAPI.createTimberVariant(newVariant)
      setVariants([...variants, res])
      setIsVariantModalOpen(false)
      setNewVariant({ species: "", grade: "", thickness: "", width: "", length: "" })
      // toast notification would go here if useToast was imported, but let's just log or ignore for now to avoid breaking imports
    } catch (err: any) {
      console.error("Failed to create variant", err)
    } finally {
      setCreatingVariant(false)
    }
  }
  
  const [form, setForm] = useState({
    purchaseNumber: "PO-" + Date.now().toString().slice(-6),
    purchaseDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    sourceId: "",
    warehouseId: "",
    notes: "",
    purchaseType: "sawn-timber",
    items: [{ 
      timberVariantId: "", 
      quantityPcs: 1, 
      volumeM3: 0, 
      purchaseThickness: 0, 
      purchaseWidth: 0, 
      purchaseLength: 0, 
      unitPrice: 0 
    }],
    logItems: [{
      logNumber: "",
      species: "",
      purchaseLength: 0,
      purchaseDiameter1: 0,
      purchaseDiameter2: 0,
      purchaseVolume: 0
    }]
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [srcData, whData, varData, specData] = await Promise.all([
          api.get("/inventory/master-data/timber-source").then(res => res.data).catch(() => []),
          api.get("/inventory/warehouses").then(res => res.data).catch(() => []),
          api.get("/inventory/master-data/timber-variant").then(res => res.data).catch(() => []),
          api.get("/inventory/master-data/timber-species").then(res => res.data).catch(() => [])
        ])
        setSources(srcData)
        setWarehouses(whData)
        setVariants(varData)
        setSpeciesList(specData)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (purchaseId) {
      api.get(`/inventory/timber-purchase/${purchaseId}`).then((res) => {
        const p = res.data;
        setForm(prev => ({
          ...prev,
          purchaseNumber: p.purchaseNumber || "",
          purchaseDate: p.purchaseDate ? p.purchaseDate.substring(0,10) : "",
          sourceId: p.sourceId || "",
          warehouseId: p.warehouseId || "",
          notes: p.notes || ""
        }));
        
        if (p.items) {
          setForm(prev => ({ ...prev, items: p.items.map((i: any) => ({ variantId: i.timberVariantId || "", quantityPcs: i.quantityPcs || 0, volumeM3: i.volumeM3 || 0, unitPrice: i.unitPrice || 0 })) })); }
        
        if (p.logItems) {
          setForm(prev => ({ ...prev, logItems: p.logItems.map((i: any) => ({ logNumber: i.logNumber || "", species: i.species || "", diameter: i.diameter || 0, length: i.length || 0, volume: i.volume || 0, unitPrice: i.unitPrice || 0 })) })); }
      }).catch(err => {
        console.error(err);
        setError("Failed to load purchase data for editing");
      });
    }
  }, [purchaseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      await api.put(`/inventory/timber-purchase/${purchaseId}`, {
        purchaseNumber: form.purchaseNumber,
        purchaseDate: new Date(form.purchaseDate).toISOString(),
        sourceId: form.sourceId,
        warehouseId: form.warehouseId,
        notes: form.notes,
        items: form.purchaseType === "sawn-timber" ? form.items : [],
        logItems: form.purchaseType === "raw-log" ? form.logItems : []
      })
      router.back()
      router.refresh()
    } catch (err: any) {
      setError((err.response?.data?.error?.message || err.response?.data?.message) || "Failed to create purchase")
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Buat Purchase (Pembelian Kayu)</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nomor PO</Label>
                <Input value={form.purchaseNumber} onChange={e => setForm({...form, purchaseNumber: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Pembelian</Label>
                <Input type="date" value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Supplier / Sumber Kayu</Label>
                <Select value={form.sourceId} onValueChange={val => setForm({...form, sourceId: val || ""})} required>
                  <SelectTrigger><SelectValue placeholder="Pilih Supplier" /></SelectTrigger>
                  <SelectContent>
                    {sources.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gudang Penerima</Label>
                <Select value={form.warehouseId} onValueChange={val => setForm({...form, warehouseId: val || ""})} required>
                  <SelectTrigger><SelectValue placeholder="Pilih Gudang" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan (Notes)</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>

            <Tabs value={form.purchaseType} onValueChange={(v) => setForm({...form, purchaseType: v})} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="sawn-timber">Beli Kayu Gergajian (Sawn Timber)</TabsTrigger>
                <TabsTrigger value="raw-log">Beli Log Bulat (Raw Log / DUKB)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sawn-timber" className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-lg">Daftar Sawn Timber</h3>
                </div>
                {form.items.map((item, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 bg-muted/10 relative">
                    <div className="absolute top-2 right-2">
                      {form.items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                          setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mt-2 pr-6">
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <Label>Variant / Sku Kayu</Label>
                          <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
                            <button type="button" onClick={() => setIsVariantModalOpen(true)} className="text-xs text-primary hover:underline font-medium">+ Buat Master Baru</button>
<DialogTrigger className="hidden">
                              <button type="button" className="text-xs text-primary hover:underline font-medium">+ Buat Master Baru</button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Buat Master Data Kayu</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleCreateVariant} className="space-y-4">
                                <div><Label>Species (Jenis Kayu)</Label><Input value={newVariant.species} onChange={e=>setNewVariant({...newVariant, species: e.target.value})} placeholder="e.g. MERANTI" required /></div>
                                <div><Label>Grade</Label><Input value={newVariant.grade} onChange={e=>setNewVariant({...newVariant, grade: e.target.value})} placeholder="e.g. A" required /></div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div><Label>Tebal (mm)</Label><Input type="number" value={newVariant.thickness} onChange={e=>setNewVariant({...newVariant, thickness: e.target.value})} required /></div>
                                  <div><Label>Lebar (mm)</Label><Input type="number" value={newVariant.width} onChange={e=>setNewVariant({...newVariant, width: e.target.value})} required /></div>
                                  <div><Label>Panjang (mm)</Label><Input type="number" value={newVariant.length} onChange={e=>setNewVariant({...newVariant, length: e.target.value})} required /></div>
                                </div>
                                <Button type="submit" disabled={creatingVariant} className="w-full">{creatingVariant ? "Menyimpan..." : "Simpan Variant"}</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <Select value={item.timberVariantId} onValueChange={(val: any) => {
                          const newItems = [...form.items];
                          const variant = variants.find(v => v.id === val);
                          newItems[index].timberVariantId = val || "";
                          if (variant) {
                             newItems[index].volumeM3 = variant.volumePerPiece * newItems[index].quantityPcs;
                             newItems[index].purchaseThickness = variant.thickness;
                             newItems[index].purchaseWidth = variant.width;
                             newItems[index].purchaseLength = variant.length;
                          }
                          setForm({ ...form, items: newItems });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Pilih Variant Kayu" /></SelectTrigger>
                          <SelectContent>
                            {variants.map(v => <SelectItem key={v.id} value={v.id}>{v.sku || `${v.species} ${v.grade} ${v.thickness}x${v.width}x${v.length}`}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity (PCS)</Label>
                        <Input type="number" min="1" value={item.quantityPcs} onChange={(e) => {
                          const newItems = [...form.items];
                          const pcs = parseInt(e.target.value) || 0;
                          newItems[index].quantityPcs = pcs;
                          const variant = variants.find(v => v.id === newItems[index].timberVariantId);
                          if (variant) newItems[index].volumeM3 = pcs * variant.volumePerPiece;
                          setForm({ ...form, items: newItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>Net Vol (M3)</Label>
                        <Input type="number" step="0.0001" value={item.volumeM3} onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[index].volumeM3 = parseFloat(e.target.value) || 0;
                          setForm({ ...form, items: newItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>P Aktual (m)</Label>
                        <Input type="number" step="0.1" value={item.purchaseLength} onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[index].purchaseLength = parseFloat(e.target.value) || 0;
                          setForm({ ...form, items: newItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>L Aktual (cm)</Label>
                        <Input type="number" step="0.1" value={item.purchaseWidth} onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[index].purchaseWidth = parseFloat(e.target.value) || 0;
                          setForm({ ...form, items: newItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>T Aktual (cm)</Label>
                        <Input type="number" step="0.1" value={item.purchaseThickness} onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[index].purchaseThickness = parseFloat(e.target.value) || 0;
                          setForm({ ...form, items: newItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>Harga Satuan</Label>
                        <Input type="number" min="0" value={item.unitPrice} onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                          setForm({ ...form, items: newItems });
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={() => {
                  setForm({ ...form, items: [...form.items, { timberVariantId: "", quantityPcs: 1, volumeM3: 0, purchaseThickness: 0, purchaseWidth: 0, purchaseLength: 0, unitPrice: 0 }] });
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Sawn Timber
                </Button>
              </TabsContent>

              <TabsContent value="raw-log" className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-lg">Daftar Raw Logs (DUKB)</h3>
                </div>
                {form.logItems.map((item, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 bg-muted/10 relative">
                    <div className="absolute top-2 right-2">
                      {form.logItems.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                          setForm({ ...form, logItems: form.logItems.filter((_, i) => i !== index) });
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mt-2 pr-6">
                      <div className="space-y-2">
                        <Label>No Log</Label>
                        <Input value={item.logNumber} onChange={(e) => {
                          const newLogItems = [...form.logItems];
                          newLogItems[index].logNumber = e.target.value;
                          setForm({ ...form, logItems: newLogItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>Spesies</Label>
                        <Select value={item.species} onValueChange={(val: any) => {
                          const newLogItems = [...form.logItems];
                          newLogItems[index].species = val;
                          setForm({ ...form, logItems: newLogItems });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Pilih Spesies" /></SelectTrigger>
                          <SelectContent>
                            {speciesList.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Panjang (m)</Label>
                        <Input type="number" step="0.1" value={item.purchaseLength} onChange={(e) => {
                          const newLogItems = [...form.logItems];
                          newLogItems[index].purchaseLength = parseFloat(e.target.value) || 0;
                            newLogItems[index].purchaseVolume = Number(calculateLogVolume(newLogItems[index].purchaseLength, newLogItems[index].purchaseDiameter1, newLogItems[index].purchaseDiameter2).toFixed(4));
                            setForm({ ...form, logItems: newLogItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>&Oslash; Pangkal (cm)</Label>
                        <Input type="number" step="0.1" value={item.purchaseDiameter1} onChange={(e) => {
                          const newLogItems = [...form.logItems];
                          newLogItems[index].purchaseDiameter1 = parseFloat(e.target.value) || 0;
                            newLogItems[index].purchaseVolume = Number(calculateLogVolume(newLogItems[index].purchaseLength, newLogItems[index].purchaseDiameter1, newLogItems[index].purchaseDiameter2).toFixed(4));
                            setForm({ ...form, logItems: newLogItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>&Oslash; Ujung (cm)</Label>
                        <Input type="number" step="0.1" value={item.purchaseDiameter2} onChange={(e) => {
                          const newLogItems = [...form.logItems];
                          newLogItems[index].purchaseDiameter2 = parseFloat(e.target.value) || 0;
                            newLogItems[index].purchaseVolume = Number(calculateLogVolume(newLogItems[index].purchaseLength, newLogItems[index].purchaseDiameter1, newLogItems[index].purchaseDiameter2).toFixed(4));
                            setForm({ ...form, logItems: newLogItems });
                        }} />
                      </div>
                      <div className="space-y-2">
                        <Label>Vol (M3)</Label>
                        <Input type="number" step="0.0001" value={item.purchaseVolume} onChange={(e) => {
                          const newLogItems = [...form.logItems];
                          newLogItems[index].purchaseVolume = parseFloat(e.target.value) || 0;
                          setForm({ ...form, logItems: newLogItems });
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={() => {
                  setForm({ ...form, logItems: [...form.logItems, { logNumber: "", species: "", purchaseLength: 0, purchaseDiameter1: 0, purchaseDiameter2: 0, purchaseVolume: 0 }] });
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Raw Log
                </Button>
              </TabsContent>
            </Tabs>

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Menyimpan..." : "Simpan Pembelian"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}



