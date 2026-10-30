'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, InventoryAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR as formatCurrency } from '@/lib/utils';
import { 
  Truck, Receipt, CheckCircle2, AlertTriangle, ExternalLink, ArrowLeft, 
  PackageCheck, FileText, Calendar, Building, Clock, Info, Loader2, Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [po, setPo] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiveWarehouseId, setReceiveWarehouseId] = useState<string>('');

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billQtys, setBillQtys] = useState<Record<string, number>>({});
  const [billDueDate, setBillDueDate] = useState<string>('');

  useEffect(() => {
    fetchPO();
    InventoryAPI.getWarehouses()
      .then((res: any) => setWarehouses(res?.data || res || []))
      .catch(() => {});
  }, [id]);

  const fetchPO = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/purchasing/orders/${id}`);
      const data = res.data;
      setPo(data);
      if (data.warehouse_id) {
        setReceiveWarehouseId(data.warehouse_id);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Gagal', description: 'Gagal memuat data Purchase Order', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openReceiveModal = () => {
    if (!po) return;
    const qtys: Record<string, number> = {};
    po.items.forEach((item: any) => {
      qtys[item.id] = Math.max(0, item.qty - (item.received_qty || 0));
    });
    setReceiveQtys(qtys);
    setReceiveWarehouseId(po.warehouse_id || (warehouses[0]?.id || ''));
    setReceiveModalOpen(true);
  };

  const openBillModal = () => {
    if (!po) return;
    const qtys: Record<string, number> = {};
    po.items.forEach((item: any) => {
      qtys[item.id] = Math.max(0, (item.received_qty || item.qty) - (item.billed_qty || 0));
    });
    setBillQtys(qtys);
    setBillDueDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    setBillModalOpen(true);
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!po) return;

    const itemsToReceive = po.items
      .map((i: any) => ({
        productId: i.product_id,
        qty: Number(receiveQtys[i.id] || 0)
      }))
      .filter((i: any) => i.qty > 0);

    if (itemsToReceive.length === 0) {
      return toast({ title: 'Perhatian', description: 'Kuantitas penerimaan minimal 1 item lebih dari 0', variant: 'destructive' });
    }

    // Client validation against remaining receivable
    for (const item of po.items) {
      const remaining = item.qty - (item.received_qty || 0);
      const entered = Number(receiveQtys[item.id] || 0);
      if (entered < 0) {
        return toast({ title: 'Error', description: `Kuantitas item ${item.product?.name || ''} tidak boleh minus`, variant: 'destructive' });
      }
      if (entered > remaining) {
        return toast({ title: 'Error', description: `Kuantitas melebihi sisa pesanan (${remaining} pcs)`, variant: 'destructive' });
      }
    }

    try {
      setActionLoading(true);
      const payload = {
        warehouseId: receiveWarehouseId || po.warehouse_id,
        items: itemsToReceive
      };

      const res = await api.post(`/purchasing/orders/${id}/receive`, payload);
      const grnNumber = res?.data?.receipt_number || res?.receipt_number || 'GRN Baru';

      toast({ 
        title: 'Penerimaan Barang Berhasil', 
        description: `Nomor Bukti GRN: ${grnNumber}. Stok gudang telah diperbarui.` 
      });
      setReceiveModalOpen(false);
      await fetchPO();
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Gagal Menerima Barang', 
        description: err.response?.data?.message || err.message || 'Terjadi kesalahan sistem', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!po) return;

    const itemsToBill = po.items
      .map((i: any) => ({
        productId: i.product_id,
        qty: Number(billQtys[i.id] || 0)
      }))
      .filter((i: any) => i.qty > 0);

    if (itemsToBill.length === 0) {
      return toast({ title: 'Perhatian', description: 'Masukkan kuantitas barang yang ingin ditagihkan', variant: 'destructive' });
    }

    // Client validation against remaining unbilled
    for (const item of po.items) {
      const remaining = item.qty - (item.billed_qty || 0);
      const entered = Number(billQtys[item.id] || 0);
      if (entered < 0) {
        return toast({ title: 'Error', description: `Kuantitas tagihan tidak boleh minus`, variant: 'destructive' });
      }
      if (entered > remaining) {
        return toast({ title: 'Error', description: `Kuantitas tagihan melebihi sisa PO (${remaining} pcs)`, variant: 'destructive' });
      }
    }

    try {
      setActionLoading(true);
      const payload = {
        items: itemsToBill,
        dueDate: billDueDate ? new Date(billDueDate).toISOString() : null
      };

      const res = await api.post(`/purchasing/orders/${id}/bill`, payload);
      const invoiceNumber = res?.data?.invoice_number || res?.invoice_number || 'Faktur Baru';

      toast({ 
        title: 'Faktur Tagihan Pembelian Dibuat', 
        description: `Nomor Tagihan: ${invoiceNumber}. Hutang usaha telah diakui.` 
      });
      setBillModalOpen(false);
      await fetchPO();
    } catch (err: any) {
      console.error(err);
      toast({ 
        title: 'Gagal Membuat Faktur', 
        description: err.response?.data?.message || err.message || 'Terjadi kesalahan sistem', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmPO = async () => {
    try {
      setActionLoading(true);
      await api.post(`/purchasing/rfq/${id}/confirm`, {});
      toast({ title: 'Pesanan Pembelian Dikonfirmasi' });
      fetchPO();
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err.response?.data?.message || 'Gagal konfirmasi PO', 
        variant: 'destructive' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span>Memuat data Purchase Order...</span>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-12 text-center text-red-500">
        Purchase Order tidak ditemukan atau Anda tidak memiliki akses.
      </div>
    );
  }

  const isFullyReceived = po.receipt_status === 'RECEIVED';
  const isFullyBilled = po.bill_status === 'BILLED';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-7xl mx-auto p-4 md:p-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-lg border shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push('/purchasing/orders')} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{po.order_number}</h1>
            <Badge variant={po.status === 'CONFIRMED' ? 'default' : 'secondary'} className="ml-2 font-semibold">
              {po.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-3 pl-10">
            <span>Supplier: <strong className="text-foreground">{po.supplier?.name}</strong></span>
            <span>•</span>
            <span>Tgl Order: <strong className="text-foreground">{new Date(po.order_date).toLocaleDateString('id-ID')}</strong></span>
            {po.payment_terms && (
              <>
                <span>•</span>
                <span>Termin: <strong className="text-foreground">{po.payment_terms}</strong></span>
              </>
            )}
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant={isFullyReceived ? 'default' : po.receipt_status === 'PARTIAL' ? 'outline' : 'secondary'}>
            Penerimaan: {po.receipt_status}
          </Badge>
          <Badge variant={isFullyBilled ? 'default' : po.bill_status === 'PARTIAL' ? 'outline' : 'secondary'}>
            Tagihan: {po.bill_status}
          </Badge>
          <Badge variant={po.payment_status === 'PAID' ? 'default' : 'outline'}>
            Pembayaran: {po.payment_status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Items & Receiving Table) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Rincian Barang & Progres Penerimaan</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Lacak kuantitas pesanan, barang fisik masuk, dan sisa</p>
              </div>
              {po.status === 'CONFIRMED' && !isFullyReceived && (
                <Button onClick={openReceiveModal} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                  <Truck className="w-4 h-4 mr-1.5" /> Terima Barang (GRN)
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted/40 text-xs text-muted-foreground uppercase font-medium">
                  <tr>
                    <th className="p-3 text-left">Produk / Barang</th>
                    <th className="p-3 text-right">Dipesan</th>
                    <th className="p-3 text-right text-emerald-600 dark:text-emerald-400">Diterima</th>
                    <th className="p-3 text-right">Ditagih</th>
                    <th className="p-3 text-right text-amber-600 dark:text-amber-400">Sisa Terima</th>
                    <th className="p-3 text-right">Harga Beli</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {po.items.map((item: any) => {
                    const remainingReceive = Math.max(0, item.qty - (item.received_qty || 0));
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="text-foreground">{item.product?.name || 'Produk'}</div>
                          <div className="text-[11px] text-muted-foreground">SKU: {item.product?.code || '-'}</div>
                        </td>
                        <td className="p-3 text-right font-semibold">{item.qty}</td>
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {item.received_qty || 0}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {item.billed_qty || 0}
                        </td>
                        <td className="p-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                          {remainingReceive}
                        </td>
                        <td className="p-3 text-right text-xs">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="p-3 text-right font-semibold text-xs">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Linked Documents (GRN & Invoices) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" /> Bukti Penerimaan Barang (GRN)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 text-xs space-y-2">
                {po.receipts && po.receipts.length > 0 ? (
                  po.receipts.map((r: any) => (
                    <div key={r.id} className="p-2.5 rounded border border-border bg-card flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-foreground">{r.receipt_number}</div>
                        <div className="text-muted-foreground text-[11px]">{new Date(r.receipt_date).toLocaleDateString('id-ID')}</div>
                      </div>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 text-[10px]">
                        {r.status || 'VALIDATED'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Belum ada penerimaan barang tercatat.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" /> Faktur Pembelian (Vendor Bills)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 text-xs space-y-2">
                {po.invoices && po.invoices.length > 0 ? (
                  po.invoices.map((inv: any) => (
                    <div key={inv.id} className="p-2.5 rounded border border-border bg-card flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-foreground">{inv.invoice_number}</div>
                        <div className="text-muted-foreground text-[11px]">{formatCurrency(inv.total)}</div>
                      </div>
                      <Badge variant={inv.status === 'PAID' ? 'default' : 'outline'} className="text-[10px]">
                        {inv.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Belum ada faktur tagihan dibuat.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column (Actions & Commercial Summary) */}
        <div className="space-y-6">
          <Card className="border shadow-sm bg-card">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-base font-semibold">Tindakan Dokumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {po.status === 'DRAFT' && (
                <Button onClick={confirmPO} disabled={actionLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  <Check className="w-4 h-4 mr-1.5" /> Konfirmasi Pesanan Pembelian
                </Button>
              )}

              {po.status === 'CONFIRMED' && !isFullyReceived && (
                <Button onClick={openReceiveModal} disabled={actionLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                  <Truck className="w-4 h-4 mr-2" /> Terima Barang Fisik
                </Button>
              )}

              {po.status === 'CONFIRMED' && !isFullyBilled && (
                <Button onClick={openBillModal} disabled={actionLoading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium">
                  <Receipt className="w-4 h-4 mr-2" /> Buat Faktur Tagihan (Bill)
                </Button>
              )}

              {isFullyBilled && (
                <Link href="/finance/vendor-bills" className="w-full block">
                  <Button variant="outline" className="w-full text-xs">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Lihat di Keuangan / Vendor Bills
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-base font-semibold">Ringkasan Finansial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Subtotal Barang</span>
                <span className="font-medium text-foreground">{formatCurrency(po.total_amount)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-baseline font-bold text-sm">
                <span>Total Komitmen PO</span>
                <span className="text-lg text-primary">{formatCurrency(po.total_amount)}</span>
              </div>
              {po.notes && (
                <div className="pt-3 border-t text-[11px] text-muted-foreground">
                  <div className="font-semibold text-foreground mb-1">Catatan / Keterangan:</div>
                  <p className="whitespace-pre-line bg-muted/30 p-2.5 rounded border border-border">{po.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal 1: Terima Barang (Goods Receipt) */}
      <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
        <DialogContent className="sm:max-w-[620px] bg-card border-border">
          <form onSubmit={handleReceiveSubmit}>
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Truck className="w-5 h-5 text-indigo-600" /> Penerimaan Barang Fisik (Goods Receipt)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Masukkan kuantitas fisik yang benar-benar tiba di gudang. Stok dan HPP FIFO akan otomatis tercatat.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Gudang Penyimpanan Masuk</Label>
                <Select value={receiveWarehouseId} onValueChange={setReceiveWarehouseId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Gudang" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                    <tr>
                      <th className="p-2.5 text-left">Produk</th>
                      <th className="p-2.5 text-right">Dipesan</th>
                      <th className="p-2.5 text-right">Sudah Diterima</th>
                      <th className="p-2.5 text-right">Sisa</th>
                      <th className="p-2.5 text-right w-[110px]">Terima Sekarang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {po.items.map((item: any) => {
                      const remaining = Math.max(0, item.qty - (item.received_qty || 0));
                      return (
                        <tr key={'rec-' + item.id} className="hover:bg-muted/20">
                          <td className="p-2.5 font-medium">{item.product?.name || item.product_id}</td>
                          <td className="p-2.5 text-right">{item.qty}</td>
                          <td className="p-2.5 text-right font-semibold text-emerald-600">{item.received_qty || 0}</td>
                          <td className="p-2.5 text-right font-bold text-amber-600">{remaining}</td>
                          <td className="p-2.5 text-right">
                            <Input
                              type="number"
                              min="0"
                              max={remaining}
                              value={receiveQtys[item.id] ?? 0}
                              onChange={(e) => setReceiveQtys({ ...receiveQtys, [item.id]: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-8 text-right text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setReceiveModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Konfirmasi Terima Barang
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Buat Faktur Tagihan (Vendor Bill) */}
      <Dialog open={billModalOpen} onOpenChange={setBillModalOpen}>
        <DialogContent className="sm:max-w-[620px] bg-card border-border">
          <form onSubmit={handleBillSubmit}>
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Receipt className="w-5 h-5 text-purple-600" /> Buat Faktur Tagihan Pembelian (Vendor Bill)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Mencatat kewajiban hutang usaha (AP) atas barang yang ditagihkan oleh supplier.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tgl. Jatuh Tempo Pembayaran</Label>
                <Input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b font-medium text-muted-foreground">
                    <tr>
                      <th className="p-2.5 text-left">Produk</th>
                      <th className="p-2.5 text-right">Dipesan</th>
                      <th className="p-2.5 text-right">Diterima Fisik</th>
                      <th className="p-2.5 text-right">Sudah Ditagih</th>
                      <th className="p-2.5 text-right w-[110px]">Tagihkan Sekarang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {po.items.map((item: any) => {
                      const remainingBill = Math.max(0, item.qty - (item.billed_qty || 0));
                      return (
                        <tr key={'bill-' + item.id} className="hover:bg-muted/20">
                          <td className="p-2.5 font-medium">{item.product?.name || item.product_id}</td>
                          <td className="p-2.5 text-right">{item.qty}</td>
                          <td className="p-2.5 text-right font-semibold text-emerald-600">{item.received_qty || 0}</td>
                          <td className="p-2.5 text-right text-muted-foreground">{item.billed_qty || 0}</td>
                          <td className="p-2.5 text-right">
                            <Input
                              type="number"
                              min="0"
                              max={remainingBill}
                              value={billQtys[item.id] ?? 0}
                              onChange={(e) => setBillQtys({ ...billQtys, [item.id]: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-8 text-right text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBillModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-medium">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Terbitkan Faktur Tagihan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
