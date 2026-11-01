'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, FinanceAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Wallet, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function CreatePaymentPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [selectedCashAccountId, setSelectedCashAccountId] = useState('');
  
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [totalReceivedAmount, setTotalReceivedAmount] = useState<number>(0);

  // Invoices for chosen customer
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<{ [invoiceId: string]: number }>({});
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [custRes, cashRes] = await Promise.all([
        api.get('/customers').catch(() => ({ data: [] })),
        api.get('/finance/payments/cash-accounts').catch(() => ({ data: [] })),
      ]);
      const custList = custRes.data?.data || custRes.data || [];
      const cashList = cashRes.data?.data || cashRes.data || [];
      setCustomers(custList);
      setCashAccounts(cashList);
      if (cashList.length > 0) {
        setSelectedCashAccountId(cashList[0].id);
      }
    } catch (e) {
      console.error('Failed loading initial payment options:', e);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleCustomerChange = async (custId: string) => {
    setSelectedCustomerId(custId);
    setAllocations({});
    if (!custId) {
      setUnpaidInvoices([]);
      return;
    }

    setLoadingInvoices(true);
    try {
      const res = await api.get('/finance/invoices', {
        params: { customerId: custId, status: 'POSTED,PARTIALLY PAID', limit: 100 },
      });
      const invs = res.data?.data || res.data || [];
      // Filter strictly AR with remaining amount > 0
      const validInvs = invs.filter(
        (i: any) =>
          (i.type === 'AR' || i.type === 'SALES_INVOICE' || !i.type) &&
          i.remaining_amount > 0 &&
          ['POSTED', 'PARTIALLY PAID'].includes(i.status)
      );
      setUnpaidInvoices(validInvs);
    } catch (e) {
      console.error('Failed loading unpaid invoices:', e);
      setUnpaidInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleAllocationChange = (invId: string, valStr: string) => {
    const val = Number(valStr) || 0;
    setAllocations((prev) => ({
      ...prev,
      [invId]: Math.max(0, val),
    }));
  };

  const handleAutoAllocate = (inv: any) => {
    const remainingToPay = inv.remaining_amount || 0;
    const currentAllocSum = Object.entries(allocations).reduce(
      (sum, [id, amt]) => (id === inv.id ? sum : sum + (amt || 0)),
      0
    );
    const availableFromReceived = Math.max(0, totalReceivedAmount - currentAllocSum);
    const allocVal = Math.min(remainingToPay, availableFromReceived > 0 ? availableFromReceived : remainingToPay);
    
    setAllocations((prev) => ({
      ...prev,
      [inv.id]: allocVal,
    }));
  };

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  const unappliedBalance = Math.max(0, totalReceivedAmount - totalAllocated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Pilih pelanggan terlebih dahulu');
      return;
    }
    if (totalReceivedAmount <= 0) {
      alert('Jumlah dana yang diterima harus lebih besar dari 0');
      return;
    }
    if (totalAllocated > totalReceivedAmount) {
      alert(`Total alokasi (Rp ${totalAllocated.toLocaleString()}) melebihi dana diterima (Rp ${totalReceivedAmount.toLocaleString()})`);
      return;
    }

    const payloadAllocations = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invId, amt]) => ({
        invoiceId: invId,
        amount: Number(amt),
      }));

    setSubmitting(true);
    try {
      await api.post('/finance/payments', {
        customerId: selectedCustomerId,
        cashAccountId: selectedCashAccountId || undefined,
        paymentDate,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        amount: Number(totalReceivedAmount),
        allowUnallocated: unappliedBalance > 0,
        allocations: payloadAllocations,
      });

      alert('Penerimaan pembayaran berhasil dikonfirmasi dan dicatat ke GL!');
      router.push('/finance/payments');
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses pembayaran: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/finance/payments')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Catat Pembayaran Pelanggan</h1>
          <p className="text-sm text-muted-foreground">
            Konfirmasi penerimaan kas/bank dan alokasikan ke satu atau beberapa faktur penjualan.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Header Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Informasi Penerimaan</CardTitle>
              <CardDescription>Pilih pelanggan dan rekening tujuan pencatatan dana</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Pelanggan *</Label>
                <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tanggal Pembayaran *</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Metode Pembayaran *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CASH">Tunai (Cash)</SelectItem>
                      <SelectItem value="GIRO">Bilyet Giro / Cek</SelectItem>
                      <SelectItem value="QRIS">QRIS / E-Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Akun Kas / Bank Tujuan *</Label>
                <Select value={selectedCashAccountId} onValueChange={setSelectedCashAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Akun Kas/Bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} ({acc.code}) - Saldo: Rp {Number(acc.current_balance || 0).toLocaleString('id-ID')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nomor Referensi (Opsional)</Label>
                  <Input
                    placeholder="Contoh: BUKTI-TRF-0988"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Catatan</Label>
                  <Input
                    placeholder="Catatan pembayaran"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount & Settlement Summary Card */}
          <Card className="bg-muted/20 border-emerald-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Jumlah Dana Diterima
              </CardTitle>
              <CardDescription>Masukkan total transfer/uang fisik yang benar-benar diterima</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Total Nominal Diterima (Rp) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="text-lg font-bold text-emerald-600"
                  placeholder="0"
                  value={totalReceivedAmount || ''}
                  onChange={(e) => setTotalReceivedAmount(Number(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="p-4 bg-background rounded-lg border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Dana Masuk:</span>
                  <span className="font-semibold">Rp {totalReceivedAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dialokasikan ke Faktur:</span>
                  <span className="font-semibold text-emerald-600">Rp {totalAllocated.toLocaleString('id-ID')}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span className="text-foreground">Sisa Uang Muka (Deposit):</span>
                  <span className={unappliedBalance > 0 ? 'text-amber-600' : 'text-muted-foreground'}>
                    Rp {unappliedBalance.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {unappliedBalance > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Sebesar <strong>Rp {unappliedBalance.toLocaleString('id-ID')}</strong> akan dicatat sebagai <strong>Uang Muka Penjualan (Deposit)</strong> milik pelanggan ini dan dapat diaplikasikan ke faktur di masa depan.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoice Allocation Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Alokasi Tagihan Faktur</CardTitle>
            <CardDescription>
              Tentukan jumlah pembayaran yang diterapkan ke setiap faktur penjualan terbuka.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCustomerId ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Pilih pelanggan terlebih dahulu untuk memuat daftar tagihan terbuka.
              </p>
            ) : loadingInvoices ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : unpaidInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tidak ada faktur belum lunas untuk pelanggan ini. Pembayaran akan disimpan utuh sebagai Uang Muka Penjualan.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 border-b text-xs uppercase text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Nomor Faktur</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3 text-right">Total Tagihan</th>
                      <th className="p-3 text-right">Sudah Dibayar</th>
                      <th className="p-3 text-right">Sisa Tagihan</th>
                      <th className="p-3 text-right w-48">Jumlah Alokasi (Rp)</th>
                      <th className="p-3 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unpaidInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20">
                        <td className="p-3 font-medium text-foreground">{inv.invoice_number}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(inv.invoice_date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="p-3 text-right">Rp {Number(inv.total || 0).toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          Rp {Number(inv.paid_amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          Rp {Number(inv.remaining_amount || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            max={inv.remaining_amount}
                            step="any"
                            placeholder="0"
                            value={allocations[inv.id] || ''}
                            onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                            className="text-right text-sm h-8"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleAutoAllocate(inv)}
                          >
                            Isi Sisa
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/finance/payments')}>
            Batal
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Konfirmasi & Simpan Pembayaran
          </Button>
        </div>
      </form>
    </div>
  );
}
