"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { 
  Search, ScanLine, Plus, Minus, Trash2, AlertTriangle, 
  User, Receipt, Tag, Grid2X2, List, CreditCard, Banknote, QrCode, ShoppingCart
} from "lucide-react"
import { InventoryAPI, PosAPI, api } from "@/lib/api"

type CartItem = {
  id: string
  name: string
  price: number
  qty: number
}

export default function PosNewTransactionPage() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState("Semua")
  const [searchQuery, setSearchQuery] = useState("")
  const [isError, setIsError] = useState(false)

  // Layout Toggle
  const [isGridLayout, setIsGridLayout] = useState(true)

  // Middle Pane
  const [orderType, setOrderType] = useState("Bungkus")
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")

  // Cart & Math
  const [cart, setCart] = useState<CartItem[]>([])
  const [isTaxEnabled, setIsTaxEnabled] = useState(true)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const taxRate = 0.11
  const taxAmount = isTaxEnabled ? subtotal * taxRate : 0
  const total = subtotal + taxAmount

  // Payment Pane
  const [paymentMode, setPaymentMode] = useState("Tunai")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paidAmount, setPaidAmount] = useState<number | "">("")
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState("")

  // Receipt
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID())
    
    const fetchData = async () => {
      try {
        const [prodRes, custRes] = await Promise.all([
          InventoryAPI.getProducts().catch(() => []),
          api.get('/customers?limit=100').catch(() => ({ data: { data: [] } }))
        ])
        const custList = custRes.data?.data || (Array.isArray(custRes.data) ? custRes.data : [])
        setCustomers(custList)

        const rawList = Array.isArray(prodRes) ? prodRes : (prodRes?.data || [])
        const mapped = rawList.map((p: any) => {
          const totalStock = p.warehouse_stocks?.reduce((sum: number, ws: any) => sum + (ws.current_stock || 0), 0) ?? 0;
          return {
            id: p.id,
            sku: p.code || p.id.substring(0, 8),
            name: p.name,
            category: p.category?.name || "Umum",
            price: Number(p.selling_price || 0),
            stock: totalStock,
            barcode: p.barcode || p.code || "",
            image_url: p.image_url || null,
          }
        })
        setProducts(mapped)
        const uniqueCategories = ["Semua", ...Array.from(new Set(mapped.map((p: any) => p.category)))] as string[]
        setCategories(uniqueCategories)
      } catch (error) {
        console.error("Database connection failed:", error)
        setIsError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)
  }

  const filteredProducts = products.filter(p => 
    (activeCategory === "Semua" || p.category === activeCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) return { ...item, qty: Math.max(1, item.qty + delta) }
      return item
    }))
  }

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const clearCart = () => setCart([])

  const handleCheckout = async () => {
    setIsCheckingOut(true)
    try {
      const _activeWh = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('active_warehouse') || 'null') : null;
      
      const finalPaidAmount = paidAmount === "" ? 0 : Number(paidAmount);
      
      const payload = {
        warehouseId: _activeWh?.id || undefined,
        paymentMethod: paymentMode === "Tunai" ? "CASH" : paymentMethod,
        idempotency_key: idempotencyKey,
        customerId: selectedCustomerId || undefined,
        paidAmount: finalPaidAmount || total,
        items: cart.map(item => ({ productId: item.id, qty: item.qty, price: item.price })),
        subtotal,
        tax: taxAmount,
        total
      }
      const checkoutResult = await PosAPI.checkout(payload)
      const _user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('erp_user') || '{}') : {};
      
      setReceiptData({
        orderNumber: checkoutResult?.data?.order_number || checkoutResult?.order_number || ('POS-' + Date.now()),
        date: new Date(),
        items: cart.map((item) => ({ ...item })),
        subtotal, tax: taxAmount, total,
        paidAmount: finalPaidAmount || total,
        change: Math.max(0, (finalPaidAmount || total) - total),
        paymentMethod: paymentMode === "Tunai" ? "CASH" : paymentMethod,
        cashierName: _user?.name || 'Kasir',
        warehouseName: _activeWh?.name || 'Pusat',
        customerName: customers.find((c) => c.id === selectedCustomerId)?.name || 'Pelanggan Umum',
      })
      setIsReceiptOpen(true)
      setCart([])
      setPaidAmount("")
      setIdempotencyKey(crypto.randomUUID())
    } catch (error: any) {
      console.error("Checkout failed", error)
      const errMessage = error?.response?.data?.error?.message || error?.response?.data?.message || error.message || "Unknown error"
      alert(`Gagal terhubung ke Database. Error: ${errMessage}`)
      setIdempotencyKey(crypto.randomUUID())
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-background overflow-hidden animate-in fade-in duration-500">
      
      {/* ======================= */}
      {/* PANE 1: PRODUCTS (LEFT) */}
      {/* ======================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/5 border-r border-border p-4 gap-4">
        {/* Top Filters & Search */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 border border-border rounded-lg bg-card p-1">
            <Button variant={isGridLayout ? "secondary" : "ghost"} size="icon" className="w-8 h-8 rounded-md" onClick={() => setIsGridLayout(true)}>
              <Grid2X2 className="w-4 h-4" />
            </Button>
            <Button variant={!isGridLayout ? "secondary" : "ghost"} size="icon" className="w-8 h-8 rounded-md" onClick={() => setIsGridLayout(false)}>
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max gap-2 px-1">
              {categories.map(c => (
                <Button 
                  key={c}
                  variant={activeCategory === c ? "default" : "outline"}
                  className={`rounded-full px-5 h-9 ${activeCategory === c ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent' : 'bg-card text-muted-foreground border-border'}`}
                  onClick={() => setActiveCategory(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari produk atau scan barcode..." 
            className="pl-9 h-11 bg-card border-border shadow-sm text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          {isError && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">Koneksi Database Terputus</h4>
                <p className="text-sm text-destructive/80">Saat ini tidak dapat mengambil data dari server database.</p>
              </div>
            </div>
          )}

          {isGridLayout ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-20">
              {filteredProducts.map(p => (
                <Card key={p.id} className="cursor-pointer border-border bg-card hover:border-indigo-500 hover:shadow-md transition-all group overflow-hidden" onClick={() => addToCart(p)}>
                  <div className="h-28 bg-indigo-50/50 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform duration-300">
                    {p.img}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">{p.name}</h3>
                    <div className="flex flex-col mt-2">
                      <p className="font-bold text-indigo-600 text-sm">{formatIDR(p.price)}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                        <span>SKU: {p.sku}</span>
                        <span className={p.stock > 0 ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"}>
                          Stok: {p.stock}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-20">
              {filteredProducts.map(p => (
                <Card key={p.id} className="cursor-pointer border-border bg-card hover:border-indigo-500 hover:shadow-md transition-all flex items-center p-3" onClick={() => addToCart(p)}>
                  <div className="w-12 h-12 bg-muted/30 rounded-md flex items-center justify-center text-xl mr-4 shrink-0 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>📦</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground">{p.name}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>SKU: {p.sku}</span>
                      <span className={p.stock > 0 ? "text-emerald-600 font-medium" : "text-rose-500 font-medium"}>
                        Stok: {p.stock}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-indigo-600 text-sm">{formatIDR(p.price)}</div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ================================== */}
      {/* PANE 2: ORDER DETAILS (MIDDLE) */}
      {/* ================================== */}
      <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col bg-card border-x border-border shrink-0 z-10 shadow-[0_0_15px_-3px_rgba(0,0,0,0.05)]">
        
        {/* Order Types */}
        <div className="p-3 border-b border-border bg-muted/10">
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex w-max gap-2 px-1">
              {["Table", "Free Table", "Bungkus", "Jasa", "Delivery", "Ojek Online"].map(type => (
                <Button 
                  key={type}
                  variant={orderType === type ? "default" : "outline"}
                  className={`h-8 px-4 rounded-md text-xs font-medium ${orderType === type ? 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100' : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted'}`}
                  onClick={() => setOrderType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        </div>

        {/* Customer Select */}
        <div className="p-4 border-b border-border">
          <select 
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
          >
            <option value="">Pilih pelanggan...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? ` - ${c.phone}` : ""}</option>)}
          </select>
        </div>

        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/5">
          <h3 className="font-semibold text-sm">Rincian Pesanan</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs border-dashed">Custom Produk</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={clearCart}>Batal</Button>
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 bg-muted/5 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20 opacity-50">
              <ShoppingCart className="w-12 h-12 mb-4" />
              <p className="text-sm">Belum ada pesanan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="bg-card border border-border rounded-lg p-3 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded flex items-center justify-center text-xl shrink-0">📦</div>
                      <div>
                        <h4 className="font-semibold text-sm leading-tight text-foreground">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-muted-foreground">SKU: {item.id.substring(0,8)}</p>
                          {isTaxEnabled && <Badge variant="outline" className="text-[9px] h-4 px-1 bg-indigo-50 text-indigo-600 border-indigo-200">PPN (11%)</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"><Tag className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-rose-500" onClick={() => removeItem(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{formatIDR(item.price)}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-border rounded-md bg-background">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none rounded-l-md hover:bg-muted" onClick={() => updateQty(item.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none rounded-r-md hover:bg-muted" onClick={() => updateQty(item.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-sm min-w-[80px] text-right">{formatIDR(item.price * item.qty)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ================================== */}
      {/* PANE 3: PAYMENT & SUMMARY (RIGHT) */}
      {/* ================================== */}
      <div className="w-full lg:w-[350px] xl:w-[380px] flex flex-col bg-card shrink-0 z-20">
        
        {/* Order Info */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
          <span className="font-semibold text-sm">Order #INV/00002</span>
          <Button variant="outline" size="sm" className="h-8 gap-2 bg-card">
            <Receipt className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">0 Pesanan</span>
          </Button>
        </div>

        {/* Summary */}
        <div className="p-4 space-y-3 text-sm border-b border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between cursor-pointer group" onClick={() => setIsTaxEnabled(!isTaxEnabled)}>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-2">
              PPN (11%)
              {!isTaxEnabled && <Badge variant="secondary" className="h-4 text-[9px]">OFF</Badge>}
            </span>
            <span className={`font-semibold ${!isTaxEnabled ? 'line-through opacity-50' : ''}`}>{formatIDR(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-base pt-2">
            <span className="font-bold">Total</span>
            <span className="font-bold text-indigo-600">{formatIDR(total)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h4 className="font-semibold text-sm mb-3">Pembayaran</h4>
          
          <Tabs defaultValue="Tunai" value={paymentMode} onValueChange={setPaymentMode} className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4 h-10">
              <TabsTrigger value="Tunai" className="font-semibold">Tunai</TabsTrigger>
              <TabsTrigger value="Non Tunai" className="font-semibold">Non Tunai</TabsTrigger>
            </TabsList>
            
            <TabsContent value="Tunai" className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-10 text-xs font-semibold bg-muted/30" onClick={() => setPaidAmount(total)}>Uang Pas</Button>
                <Button variant="outline" className="h-10 text-xs font-semibold bg-muted/30" onClick={() => setPaidAmount("")}>Lainnya</Button>
                {[50000, 100000, 150000, 200000].map(amt => (
                  <Button key={amt} variant="outline" className="h-10 text-xs font-medium" onClick={() => setPaidAmount(amt)}>{formatIDR(amt)}</Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="Non Tunai" className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {["Transfer", "EDC", "QRIS", "Payment Gateway", "Deposit"].map(method => (
                  <Button 
                    key={method} 
                    variant={paymentMethod === method ? "default" : "outline"} 
                    className={`h-10 text-xs font-medium ${paymentMethod === method ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''}`}
                    onClick={() => {
                      setPaymentMethod(method)
                      setPaidAmount(total) // Auto fill exact amount for non-cash
                    }}
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground font-semibold">Rp</div>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value ? Number(e.target.value) : "")}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-border bg-background font-bold text-lg text-right focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Total Tagihan</span>
                <span className="font-semibold text-foreground">{formatIDR(total)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Total Pembayaran</span>
                <span className="font-semibold text-foreground">{formatIDR(Number(paidAmount) || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-border/50">
                <span className={`font-semibold ${(Number(paidAmount) || 0) < total ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {(Number(paidAmount) || 0) < total ? 'Sisa Tagihan' : 'Kembalian'}
                </span>
                <span className={`font-bold ${(Number(paidAmount) || 0) < total ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {formatIDR(Math.abs(total - (Number(paidAmount) || 0)))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-muted/10 border-t border-border flex gap-3">
          <Button variant="secondary" className="flex-1 font-semibold border border-border bg-card hover:bg-muted text-muted-foreground">
            Simpan Pesanan
          </Button>
          <Button 
            className="flex-1 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
            disabled={cart.length === 0 || isCheckingOut}
            onClick={handleCheckout}
          >
            {isCheckingOut ? "Proses..." : "Bayar"}
          </Button>
        </div>

      </div>

      {/* ====== RECEIPT MODAL ====== */}
      {receiptData && (
        <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="max-w-sm p-0 overflow-hidden">
            <div id="pos-receipt" className="bg-card text-foreground p-6 font-mono text-sm">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="font-bold text-lg uppercase tracking-widest text-foreground">STRUK PEMBAYARAN</div>
                <div className="text-xs text-muted-foreground">{receiptData.warehouseName}</div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(receiptData.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</div>
              </div>

              {/* Order Info */}
              <div className="border-t border-dashed border-border pt-3 mb-3">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>No. Transaksi</span>
                  <span className="font-semibold text-foreground">{receiptData.orderNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Kasir</span>
                  <span className="font-semibold text-foreground">{receiptData.cashierName}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-dashed border-border py-3 mb-3">
                {receiptData.items.map((item: any, i: number) => (
                  <div key={i} className="mb-2">
                    <div className="font-medium text-foreground truncate">{item.name}</div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                      <span>{item.qty} x Rp {Math.round(item.price).toLocaleString('id-ID')}</span>
                      <span className="font-semibold text-foreground">Rp {Math.round(item.qty * item.price).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-border pt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Subtotal</span>
                  <span>Rp {Math.round(receiptData.subtotal).toLocaleString('id-ID')}</span>
                </div>
                {receiptData.tax > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>PPN (11%)</span>
                    <span>Rp {Math.round(receiptData.tax).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base mt-2 text-foreground">
                  <span>TOTAL</span>
                  <span>Rp {Math.round(receiptData.total).toLocaleString('id-ID')}</span>
                </div>
                <div className="border-t border-dashed border-border my-2" />
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Metode Bayar</span>
                  <span className="font-medium">{receiptData.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Dibayar</span>
                  <span className="font-medium">Rp {Math.round(receiptData.paidAmount).toLocaleString('id-ID')}</span>
                </div>
                {receiptData.change > 0 && (
                  <div className="flex justify-between text-xs font-bold text-emerald-600 mt-1">
                    <span>Kembalian</span>
                    <span>Rp {Math.round(receiptData.change).toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-4 bg-muted/20 border-t border-border">
              <Button onClick={() => setIsReceiptOpen(false)} variant="outline" className="flex-1">Tutup</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}
