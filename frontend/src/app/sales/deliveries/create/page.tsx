"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { B2BApi } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Truck } from 'lucide-react'

export default function CreateDeliveryPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [selectedSoId, setSelectedSoId] = useState('')
  const [soDetails, setSoDetails] = useState<any>(null)
  
  const [itemsToDeliver, setItemsToDeliver] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [driverName, setDriverName] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [containerNumber, setContainerNumber] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    let initialSoId = '';
    if (typeof window !== 'undefined') {
      initialSoId = new URLSearchParams(window.location.search).get('so_id') || '';
    }
    try {
      const res = await B2BApi.getOrders({ limit: 100 })
      // Only show orders that are confirmed or partially delivered
      const validOrders = (res?.data || []).filter((o: any) => o.order_number?.startsWith('SO') && o.delivery_status !== 'DELIVERED')
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
      return
    }
    
    try {
      const res = await B2BApi.getOrder(id)
      setSoDetails(res)
      
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
        return {
          productId: item.product_id,
          productName: item.product?.name || 'Item',
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
    if (itemsToDeliver.some(i => i.qty < 0 || i.qty > i.remainingQty)) return alert('Qty pengiriman tidak valid')
    
    // Filter out items with 0 qty
    const finalItems = itemsToDeliver.filter(i => i.qty > 0).map(i => ({ productId: i.productId, qty: i.qty }))
    if (finalItems.length === 0) return alert('Minimal ada 1 barang dengan qty > 0')
    
    setLoading(true)
    try {
      await B2BApi.createDelivery(selectedSoId, { 
        items: finalItems,
        driverName,
        vehiclePlate,
        containerNumber
      })
      alert('Surat Jalan berhasil dibuat!')
      router.push('/sales/deliveries')
    } catch (err: any) {
      alert('Gagal: ' + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/sales/deliveries")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Pengiriman Baru</h1>
          <p className="text-muted-foreground text-sm">Pilih pesanan pelanggan dan tentukan jumlah barang yang dikirim.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Informasi Surat Jalan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Pilih Sales Order (SO)</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedSoId} 
              onChange={e => handleSelectSo(e.target.value)}
            >
              <option value="">-- Pilih Sales Order --</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.order_number} - {o.customer?.name} (Tgl: {new Date(o.order_date).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Supir / Pengirim (Opsional)</label>
              <Input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Misal: Budi" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plat Kendaraan (Opsional)</label>
              <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="Misal: B 1234 CD" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nomor Kontainer (Opsional)</label>
              <Input value={containerNumber} onChange={e => setContainerNumber(e.target.value)} placeholder="Misal: CONT-999" />
            </div>
          </div>
        </CardContent>
      </Card>

      {soDetails && (
        <Card>
          <CardHeader><CardTitle>Barang yang Dikirim</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left">Produk</th>
                    <th className="p-3 text-right">Dipesan</th>
                    <th className="p-3 text-right">Sisa / Belum Kirim</th>
                    <th className="p-3 text-right">Qty Dikirim (Saat Ini)</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsToDeliver.map(item => (
                    <tr key={item.productId} className="border-b last:border-0">
                      <td className="p-3">{item.productName}</td>
                      <td className="p-3 text-right">{item.orderedQty}</td>
                      <td className="p-3 text-right font-medium">{item.remainingQty}</td>
                      <td className="p-3 text-right">
                        <Input 
                          type="number" 
                          min="0" 
                          max={item.remainingQty} 
                          value={item.qty} 
                          onChange={e => handleQtyChange(item.productId, e.target.value)}
                          className="w-24 ml-auto text-right"
                        />
                      </td>
                    </tr>
                  ))}
                  {itemsToDeliver.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Semua barang pada pesanan ini sudah terkirim.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={loading || itemsToDeliver.length === 0}>
                {loading ? 'Memproses...' : <><Save className="w-4 h-4 mr-2" /> Simpan Surat Jalan</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
