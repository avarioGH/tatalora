'use client';

import { useEffect, useState } from 'react';
import { FinanceAPI, api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Eye, RefreshCw, Undo2, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function PaymentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'AR' | 'DEPOSIT'>('ALL');
  const [search, setSearch] = useState('');
  
  // Reversal dialog state
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailPayment, setDetailPayment] = useState<any>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await FinanceAPI.getPayments({ page: 1, limit: 100 });
      setData(res?.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!selectedPayment) return;
    if (!reversalReason.trim()) {
      alert('Mohon masukkan alasan pembatalan pembayaran');
      return;
    }
    setReversing(true);
    try {
      await api.post(`/finance/payments/${selectedPayment.id}/reverse`, {
        reason: reversalReason.trim(),
      });
      alert('Pembayaran berhasil dibatalkan dan jurnal pembalik telah dibuat.');
      setReverseDialogOpen(false);
      setSelectedPayment(null);
      setReversalReason('');
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      alert('Gagal membatalkan pembayaran: ' + (err.response?.data?.message || err.message));
    } finally {
      setReversing(false);
    }
  };

  const filteredData = data.filter((item) => {
    const isCancelled = item.deleted_at || (item.notes && item.notes.includes('[DIBATALKAN]'));
    const isDeposit = !item.allocations?.some((a: any) => a.invoice_id) && item.customer_id;
    
    if (filterType === 'AR' && isDeposit) return false;
    if (filterType === 'DEPOSIT' && !isDeposit) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = item.payment_number?.toLowerCase().includes(q);
      const matchCust = item.customer?.name?.toLowerCase().includes(q);
      const matchRef = item.reference?.toLowerCase().includes(q);
      return matchNum || matchCust || matchRef;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pembayaran Piutang & Uang Muka</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Penerimaan kas/bank pelanggan, alokasi multi-faktur, dan pelunasan piutang usaha (AR).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={filterType === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('ALL')}
          >
            Semua Penerimaan
          </Button>
          <Button
            variant={filterType === 'AR' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('AR')}
          >
            Pelunasan Faktur (AR)
          </Button>
          <Button
            variant={filterType === 'DEPOSIT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('DEPOSIT')}
          >
            Uang Muka (Deposit)
          </Button>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Cari nomor, pelanggan, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Nomor Pembayaran</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Pelanggan</th>
                  <th className="p-4">Metode & Akun</th>
                  <th className="p-4 text-right">Total Diterima</th>
                  <th className="p-4">Alokasi & Sisa</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Memuat data pembayaran...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Tidak ada catatan pembayaran yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const isCancelled = item.deleted_at || (item.notes && item.notes.includes('[DIBATALKAN]'));
                    const totalAlloc = (item.allocations || []).reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
                    const unallocated = Math.max(0, Number(item.amount || 0) - totalAlloc);

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-medium text-foreground">
                          {item.payment_number}
                          {item.reference && (
                            <span className="block text-xs text-muted-foreground">Ref: {item.reference}</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(item.payment_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-foreground">{item.customer?.name || 'Pelanggan Umum'}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs">
                            {item.payment_method}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          Rp {Number(item.amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-4">
                          <div className="text-xs space-y-0.5">
                            <div>Dialokasikan: <span className="font-medium">Rp {totalAlloc.toLocaleString('id-ID')}</span></div>
                            {unallocated > 0 && (
                              <div className="text-amber-600 font-medium">Uang Muka: Rp {unallocated.toLocaleString('id-ID')}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {isCancelled ? (
                            <Badge variant="destructive" className="text-xs">
                              DIBATALKAN
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/30 text-xs">
                              COMPLETED
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDetailPayment(item);
                                setDetailDialogOpen(true);
                              }}
                              title="Lihat Rincian"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!isCancelled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => {
                                  setSelectedPayment(item);
                                  setReverseDialogOpen(true);
                                }}
                                title="Batalkan Pembayaran (Reversal)"
                              >
                                <Undo2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Rincian Pembayaran {detailPayment?.payment_number}
            </DialogTitle>
          </DialogHeader>
          {detailPayment && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg">
                <div>
                  <span className="text-xs text-muted-foreground block">Pelanggan</span>
                  <span className="font-semibold">{detailPayment.customer?.name || 'Pelanggan Umum'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Tanggal Penerimaan</span>
                  <span className="font-semibold">{new Date(detailPayment.payment_date).toLocaleDateString('id-ID')}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Metode Pembayaran</span>
                  <span className="font-semibold">{detailPayment.payment_method}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Nomor Referensi</span>
                  <span className="font-semibold">{detailPayment.reference || '-'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Alokasi Faktur Penjualan
                </h4>
                {detailPayment.allocations?.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Tidak ada faktur teralokasi langsung. Seluruh pembayaran disimpan sebagai Uang Muka Penjualan.
                  </p>
                ) : (
                  <div className="border rounded-md divide-y divide-border overflow-hidden">
                    {detailPayment.allocations.map((alloc: any) => (
                      <div key={alloc.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium text-foreground">
                            {alloc.invoice?.invoice_number || alloc.sales_order?.order_number || 'Alokasi Terhubung'}
                          </span>
                        </div>
                        <span className="font-semibold text-emerald-600">
                          Rp {Number(alloc.amount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-3 flex justify-between text-sm font-semibold">
                <span>Total Dana Diterima:</span>
                <span className="text-emerald-600">
                  Rp {Number(detailPayment.amount).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reversal Confirmation Dialog */}
      <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Batalkan Pembayaran (Reversal)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Apakah Anda yakin ingin membatalkan pembayaran <strong>{selectedPayment?.payment_number}</strong> sebesar{' '}
              <strong>Rp {Number(selectedPayment?.amount || 0).toLocaleString('id-ID')}</strong>?
            </p>
            <p className="text-xs text-muted-foreground">
              Tindakan ini akan mengembalikan sisa tagihan piutang faktur terkait, membatalkan transaksi kas/bank, dan membuat jurnal pembalik kompensasi secara permanen.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Alasan Pembatalan:</label>
              <Input
                placeholder="Contoh: Kesalahan nominal transfer / cek bilyet giro ditolak"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReverseDialogOpen(false)} disabled={reversing}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleReverse} disabled={reversing}>
              {reversing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Konfirmasi Pembalikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
