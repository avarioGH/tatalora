'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { DisposalAPI, InventoryAPI, api } from '@/lib/api';
import { ArrowLeft, Trash2, Plus, AlertCircle, Save, Loader2 } from 'lucide-react';

export default function CreateDisposalPage() {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMaster = async () => {
      setLoading(true);
      try {
        const [prodRes, whRes] = await Promise.all([
          InventoryAPI.getProducts().catch(() => []),
          api.get('/inventory/warehouses').catch(() => ({ data: [] }))
        ]);
        setProducts(Array.isArray(prodRes) ? prodRes : (prodRes?.data || []));
        const whList = Array.isArray(whRes?.data) ? whRes.data : [];
        setWarehouses(whList);
        if (whList.length > 0) setWarehouseId(whList[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMaster();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { itemId: '', quantity: 1, unit: 'Pcs' }]);
  };

  const handleProductChange = (index: number, pId: string) => {
    const prod = products.find(p => p.id === pId);
    const newItems = [...items];
    newItems[index].itemId = pId;
    newItems[index].unit = prod?.unit?.name || prod?.unit || 'Pcs';
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.itemId && it.quantity > 0);
    if (validItems.length === 0) {
      alert('Pilih minimal 1 produk yang akan dimusnahkan/disposal!');
      return;
    }

    setSubmitting(true);
    try {
      await DisposalAPI.create({ 
        reason, 
        warehouse_id: warehouseId || undefined,
        items: validItems.map(it => ({
          itemId: it.itemId,
          quantity: Number(it.quantity) || 1
        }))
      });
      router.push('/inventory/disposals');
    } catch (error: any) {
      console.error(error);
      alert('Gagal mencatat pemusnahan barang: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto pb-20 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/inventory/disposals')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Inventori & Gudang</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-rose-600" />
              Catat Pemusnahan Barang (Stock Disposal)
            </h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Informasi Pemusnahan</CardTitle>
            <CardDescription>Tentukan gudang penyimpanan dan alasan penghapusan stok fisik.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Gudang Lokasi Barang</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Pilih Gudang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Alasan Pemusnahan (Reason)</Label>
                <Input 
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  placeholder="Contoh: Barang kadaluwarsa, rusak fisik, kebocoran cold storage..." 
                  required 
                  className="bg-background border-border"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Daftar Produk yang Dimusnahkan</CardTitle>
                <CardDescription>Pilih produk berdasarkan nama / SKU bisnis, bukan UUID teknis.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50">
                <Plus className="w-4 h-4" /> Tambah Produk
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[60%] font-semibold">Produk (Nama & SKU)</TableHead>
                    <TableHead className="w-[20%] font-semibold text-center">Jumlah (Qty)</TableHead>
                    <TableHead className="w-[10%] font-semibold text-center">Satuan</TableHead>
                    <TableHead className="w-[10%] text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-28 text-center text-muted-foreground text-sm">
                        Belum ada produk ditambahkan. Klik &quot;Tambah Produk&quot; untuk memilih barang yang dimusnahkan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index} className="hover:bg-slate-50/50">
                        <TableCell className="p-3">
                          <Select 
                            value={item.itemId} 
                            onValueChange={(val) => handleProductChange(index, val)}
                          >
                            <SelectTrigger className="h-9 bg-background border-border text-xs w-full">
                              <SelectValue placeholder="-- Pilih Produk --" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-xs">
                                  {p.name} {p.sku ? `(${p.sku})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          <Input 
                            type="number" 
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const newItems = [...items];
                              newItems[index].quantity = Math.max(1, parseInt(e.target.value) || 1);
                              setItems(newItems);
                            }}
                            className="h-9 bg-background border-border text-center text-xs font-semibold"
                            required 
                          />
                        </TableCell>
                        <TableCell className="p-3 text-center text-xs font-medium text-muted-foreground">
                          {item.unit || 'Pcs'}
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {items.length > 0 && (
          <div className="flex items-center gap-2 p-3 text-xs text-blue-700 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Biaya kerugian pemusnahan (Loss / Scrap Expense) akan dihitung otomatis sesuai metode FIFO saat diposting.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={() => router.push('/inventory/disposals')} disabled={submitting}>
            Batalkan
          </Button>
          <Button type="submit" disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Pemusnahan Barang
          </Button>
        </div>
      </form>
    </div>
  );
}
