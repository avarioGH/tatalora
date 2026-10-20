"use client"
import { useState, useEffect, useRef } from "react"
import { InventoryAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Plus, X, ArrowLeft, Search } from "lucide-react"

function SearchableSelect({ options, value, onChange, placeholder, disabled = false }: any) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options?.find((o: any) => o.id === value)
  const displayValue = open ? search : (selectedOption ? selectedOption.name : "")

  const filteredOptions = (options || []).filter((o: any) => 
    (o.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Input 
          disabled={disabled}
          value={displayValue}
          onChange={e => { setSearch(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setOpen(true); setSearch(""); }}
          placeholder={selectedOption ? selectedOption.name : placeholder || `Pilih... (Total: ${options?.length || 0})`}
          className="w-full pr-8 cursor-pointer bg-accent/30"
          readOnly={!open}
        />
        <Search className="w-4 h-4 absolute right-3 top-2.5 text-muted-foreground pointer-events-none" />
      </div>
      
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border shadow-md rounded-md max-h-60 overflow-y-auto" style={{ display: 'block' }}>
          <div className="p-1 sticky top-0 bg-popover/90 backdrop-blur-sm border-b">
             <Input 
               autoFocus
               value={search}
               onChange={e => setSearch(e.target.value)}
               placeholder={`Ketik untuk mencari... (Total: ${options?.length || 0})`}
               className="h-8 text-sm"
             />
          </div>
          {(!filteredOptions || filteredOptions.length === 0) ? (
            <div className="p-3 text-sm text-center text-red-500 bg-red-100 font-bold border border-red-500">
              Pencarian tidak ditemukan! (Total Data: {options?.length || 0})
            </div>
          ) : (
            filteredOptions.map((o: any, i: number) => (
              <div 
                key={o?.id || i} 
                className="px-3 py-2 text-sm cursor-pointer hover:bg-accent text-foreground"
                style={{ minHeight: '36px', display: 'block', borderBottom: '1px solid #333', visibility: 'visible', opacity: 1 }}
                onClick={() => { onChange(o?.id); setOpen(false); setSearch(""); }}
              >
                {o?.name || 'TANPA NAMA'} {o?.weight ? `(${o.weight}g)` : ''} (ID: {o?.id || 'NO_ID'})
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function CreateInflowPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [lockedWarehouse, setLockedWarehouse] = useState(false)

  const [form, setForm] = useState({
    warehouse_id: "",
    tally_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    notes: ""
  })

  const [items, setItems] = useState([
    { product_id: "", qty: 1 }
  ])

  useEffect(() => {
    Promise.all([
      InventoryAPI.getWarehouses().catch(() => []),
      InventoryAPI.getProducts().catch(() => [])
    ]).then(([wh, prod]) => {
      setWarehouses(wh?.data || wh || [])
      setProducts(prod?.data || prod || [])
      
      if (typeof window !== 'undefined') {
        const active = localStorage.getItem('active_warehouse')
        if (active && active !== 'all') {
          try {
            const parsed = JSON.parse(active);
            if (parsed && parsed.id) {
              setLockedWarehouse(true);
              setForm(prev => ({ ...prev, warehouse_id: parsed.id }));
            }
          } catch(e) {
            setLockedWarehouse(true);
            setForm(prev => ({ ...prev, warehouse_id: active }));
          }
        }
      }
    })
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.warehouse_id) return toast({ title: "Pilih Gudang Penerima", variant: "destructive" })
    
    // Validasi item kosong
    const validItems = (Array.isArray(items) ? items : []).filter(i => i.product_id && i.qty > 0)
    if (validItems.length === 0) return toast({ title: "Pilih minimal 1 produk dengan jumlah valid", variant: "destructive" })
    
    setLoading(true)
    try {
      await InventoryAPI.createStockInTally({
        ...form,
        items: validItems
      })
      toast({ title: "Berhasil mencatat produk masuk" })
      router.push("/inventory/inflow")
    } catch(err: any) {
      toast({ title: "Gagal mencatat", description: err?.response?.data?.message || err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/inventory/inflow")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Catat Stok Masuk</h1>
          <p className="text-muted-foreground text-sm">Input data penerimaan stok barang/material ke gudang</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="overflow-visible">
          <CardHeader><CardTitle>Informasi Penerimaan</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Masuk</Label>
              <Input type="date" value={form.tally_date} onChange={e => setForm({...form, tally_date: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Gudang Tujuan</Label>
              <SearchableSelect 
                options={warehouses} 
                value={form.warehouse_id} 
                onChange={(v: any) => setForm({...form, warehouse_id: v})} 
                placeholder="Pilih Gudang..."
                disabled={lockedWarehouse}
                renderLabel={(o: any) => o.name}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Keterangan Tambahan</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Contoh: Referensi PO, Nama Supplier, atau Catatan Pengiriman" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible">
          <CardHeader className="flex flex-row justify-between items-center pb-2">
            <CardTitle>Rincian Produk</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { product_id: "", qty: 1 }])}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Baris
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 mt-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-end border-b border-border/40 pb-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Produk</Label>
                  <SearchableSelect 
                    options={products} 
                    value={item.product_id} 
                    onChange={(v: any) => {
                      const newItems = [...items]; 
                      newItems[index].product_id = v;
                      setItems(newItems);
                    }} 
                    placeholder="Pilih Produk..." 
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label className="text-xs">Jumlah</Label>
                  <Input type="number" min="1" value={item.qty} onChange={e => {
                    const newItems = [...items]; newItems[index].qty = e.target.value as any; setItems(newItems);
                  }} />
                </div>
                <div className="pb-1">
                  <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900" onClick={() => setItems((Array.isArray(items) ? items : []).filter((_, i) => i !== index))}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Belum ada barang ditambahkan.</p>}
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? "Menyimpan..." : "Simpan Data Stok Masuk"}
        </Button>
      </form>
    </div>
  )
}




