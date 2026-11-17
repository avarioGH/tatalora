"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { B2BApi, InventoryAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Truck, Info, Calendar, MapPin, Warehouse } from 'lucide-react'

export default function CreateDeliveryPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selectedSoId, setSelectedSoId] = useState('')
  const [soDetails, setSoDetails] = useState<any>(null)
  
  const [itemsToDeliver, setItemsToDeliver] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [destinationAddress, setDestinationAddress] = useState('')
  const [sourceWarehouseId, setSourceWarehouseId] = useState('')
  const [driverName, setDriverName] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [containerNumber, setContainerNumber] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    let initialSoId = '';
    if (typeof window !== 'undefined') {
      initialSoId = new URLSearchParams(window.location.search).get('so_id') || '';
    }
    try {
      const [orderRes, whRes] = await Promise.all([
        B2BApi.getOrders({ limit: 100 }),
        InventoryAPI.getWarehouses().catch(() => [])
      ])
      
      const whList = Array.isArray(whRes) ? whRes : (whRes?.data || [])
      setWarehouses(whList)
      if (whList.length > 0) setSourceWarehouseId(whList[0].id)

      // Only show orders that are confirmed or partially delivered (exclude cancelled and fully delivered)
      const validOrders = (orderRes?.data || []).filter((o: any) => {
        const isNotFinished = o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && o.delivery_status !== 'DELIVERED';
        const isReadyStatus = o.status === 'CONFIRMED' || o.status === 'PROCESSING' || o.status === 'PENDING';
        return isNotFinished && isReadyStatus;
      })
      setOrders(validOrders)
      if (initialSoId && validOrders.find((o: any) => o.id === initialSoId)) {
        setTimeout(() => handleSelectSo(initialSoId), 100);
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelectSo = async (id: string) => {
    setSelectedSoId(id)
    if (!id) {
      setSoDetails(null)
      setItemsToDeliver([])
      setDestinationAddress('')
      return
    }
    
    try {
      const res = await B2BApi.getOrder(id)
      setSoDetails(res)
      
      if (res.customer?.address) {
        setDestinationAddress(res.customer.address)
      } else if (res.shipping_address) {
        setDestinationAddress(res.shipping_address)
      }
      
      if (res.warehouse_id) {
        setSourceWarehouseId(res.warehouse_id)
      }

      // Calculate remaining qty to auto-fill
      const deliveredMap: any = {};
      (res.deliveries || []).forEach((d: any) => {
        (d.items || []).forEach((i: any) => {
          deliveredMap[i.product_id] = (deliveredMap[i.product_id] || 0) + i.delivered_qty;
        });
      });
      
      const toDeliver = (res.items || []).map((item: any) => {
        const delivered = deliveredMap[item.product_id] || 0;
        const remaining = Math.max(0, item.qty - delivered);
        
        // Find stock in warehouse
        let availableStock = 0;
        if (item.product?.warehouse_stocks) {
          const ws = item.product.warehouse_stocks.find((s: any) => !sourceWarehouseId || s.warehouse_id === sourceWarehouseId);
          availableStock = ws ? (ws.current_stock ?? ws.quantity ?? 0) : (item.product?.current_stock ?? item.product?.stock ?? 0);
        }

        const unitName = typeof item.product?.unit === 'object' && item.product?.unit !== null 
          ? (item.product.unit.name || 'Pcs') 
          : (item.product?.unit || item.unit || 'Pcs');

        return {
          productId: item.product_id,
          productName: item.product?.name || 'Item',
          sku: item.product?.code || '-',
          unit: unitName,
          availableStock,
          orderedQty: item.qty,
          deliveredQty: delivered,
          remainingQty: remaining,
          qty: remaining // The user input defaults to full remaining
        }
      }).filter((item: any) => item.remainingQty > 0);
      
      setItemsToDeliver(toDeliver)
    } catch (e) {
      console.error(e)
    }
  }

  const handleQtyChange = (productId: string, val: string) => {
    const qty = Number(val) || 0;
    setItemsToDeliver(itemsToDeliver.map(i => i.productId === productId ? { ...i, qty } : i))
  }

  const handleSave = async () => {
    if (!selectedSoId) return alert('Pilih Sales Order terlebih dahulu')
    if (itemsToDeliver.length === 0) return alert('Tidak ada barang yang bisa dikirim')
    if (itemsToDeliver.some(i => i.qty < 0 || i.qty > i.remainingQty)) return alert('Qty pengiriman tidak valid (tidak boleh negatif atau melebihi sisa pesanan)')
    
    // Filter out items with 0 qty
    const finalItems = itemsToDeliver.filter(i => i.qty > 0).map(i => ({ productId: i.productId, qty: i.qty }))
    if (finalItems.length === 0) return alert('Minimal ada 1 barang dengan qty > 0')
    
    setLoading(true)
    try {
      await B2BApi.createDelivery(selectedSoId, { 
        items: finalItems,
        deliveryDate,
        destinationAddress,
        warehouseId: sourceWarehouseId,
        driverName,
        vehiclePlate,
        containerNumber
      })
      alert('Surat Jalan (DO) berhasil dibuat! Stok gudang otomatis diperbarui.')
      router.push('/sales/deliveries')
    } catch (err: any) {
      alert('Gagal: ' + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/sales/deliveries")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Buat Surat Jalan (Delivery Order)</h1>
          <p className="text-muted-foreground text-sm">Pilih pesanan pelanggan, verifikasi alamat pengiriman dan stok gudang asal.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Informasi Dokumen Pengiriman</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Pilih Sales Order (SO) <span className="text-rose-500">*</span></label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={selectedSoId} 
                onChange={e => handleSelectSo(e.target.value)}
              >
                <option value="">-- Pilih Sales Order --</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} - {o.customer?.name || 'Pelanggan'} | Status: {o.status === 'CONFIRMED' ? 'Terkonfirmasi' : o.status === 'PROCESSING' ? 'Diproses' : o.status} (Tgl: {new Date(o.order_date || o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Tanggal Pengiriman <span className="text-rose-500">*</span>
              </label>
              <Input 
                type="date" 
                value={deliveryDate} 
                onChange={e => setDeliveryDate(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                Gudang Sumber Pengeluaran Barang <span className="text-rose-500">*</span>
              </label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={sourceWarehouseId} 
                onChange={e => setSourceWarehouseId(e.target.value)}
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code || 'Gudang'})</option>
                ))}
                {warehouses.length === 0 && <option value="">Semua Gudang</option>}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Alamat Tujuan Pengiriman
              </label>
              <Input 
                value={destinationAddress} 
                onChange={e => setDestinationAddress(e.target.value)} 
                placeholder="Alamat lengkap penerima barang..." 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Supir / Pengirim</label>
              <Input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Misal: Budi / Ekspedisi JNE" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plat Kendaraan</label>
              <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="Misal: B 1234 CD" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor Kontainer / Resi</label>
              <Input value={containerNumber} onChange={e => setContainerNumber(e.target.value)} placeholder="Misal: CONT-999 / RESI-123" />
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <Info className="w-4 h-4 shrink-0" />
            <span>Pencatatan Surat Jalan (DO) ini otomatis mengurangi saldo fisik persediaan di gudang sumber yang dipilih setelah disimpan.</span>
          </div>
        </CardContent>
      </Card>

      {soDetails && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Rincian Barang yang Dikirim</CardTitle>
              <Badge variant="outline" className="text-xs">
                Ref SO: {soDetails.order_number}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left">Produk</th>
                    <th className="p-3 text-center">Satuan</th>
                    <th className="p-3 text-right">Dipesan</th>
                    <th className="p-3 text-right">Sudah Kirim</th>
                    <th className="p-3 text-right">Sisa Belum Kirim</th>
                    <th className="p-3 text-right">Stok Tersedia (Gudang)</th>
                    <th className="p-3 text-right">Qty Dikirim (Saat Ini)</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsToDeliver.map(item => (
                    <tr key={item.productId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">
                        <div>{item.productName}</div>
                        <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">{item.unit}</td>
                      <td className="p-3 text-right">{item.orderedQty}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.deliveredQty}</td>
                      <td className="p-3 text-right font-semibold text-primary">{item.remainingQty}</td>
                      <td className="p-3 text-right">
                        <span className={`font-medium px-2 py-0.5 rounded text-xs ${item.availableStock >= item.remainingQty ? 'bg-emerald-500/10 text-emerald-600' : item.availableStock > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {item.availableStock} {item.unit}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Input 
                          type="number" 
                          min="0" 
                          max={item.remainingQty} 
                          value={item.qty} 
                          onChange={e => handleQtyChange(item.productId, e.target.value)}
                          className="w-24 ml-auto text-right font-bold"
                        />
                      </td>
                    </tr>
                  ))}
                  {itemsToDeliver.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Semua barang pada pesanan ini sudah terkirim sepenuhnya.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={loading || itemsToDeliver.length === 0} className="gap-2">
                {loading ? 'Memproses...' : <><Save className="w-4 h-4" /> Simpan Surat Jalan</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
