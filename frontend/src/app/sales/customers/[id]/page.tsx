"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, FileText, Banknote, User } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, FinanceAPI } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get('/customers/' + id);
        setData(res.data);
      } catch (error) {
        console.error("Failed to fetch customer detail", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return <div className="p-6">Memuat data...</div>;
  }

  if (!data || !data.customer) {
    return <div className="p-6">Data pelanggan tidak ditemukan.</div>;
  }

  const { customer, financials, salesOrders, payments } = data;

  
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState('Transfer');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.get('/customers/' + id);
      setData(res.data);
    } catch (error) {}
  };

  const handleSavePayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) return alert('Nominal harus lebih dari 0');
    setIsPaying(true);
    try {
      const sortedOrders = [...(salesOrders || [])].sort((a: any, b: any) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());
      
      let remainingToAllocate = Number(payAmount);
      const unpaidOrders: any[] = [];
      
      for (const so of sortedOrders) {
        if (remainingToAllocate <= 0) break;
        if (so.status === 'CANCELLED') continue;
        
        const paid = so.allocations?.reduce((acc: number, a: any) => acc + a.amount, 0) || 0;
        const outst = so.total_amount - paid;
        
        if (outst > 0) {
          const allocate = Math.min(outst, remainingToAllocate);
          unpaidOrders.push({ salesOrderId: so.id, amount: allocate });
          remainingToAllocate -= allocate;
        }
      }

      await FinanceAPI.createPayment({
        partnerId: id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        paymentDate: payDate,
        reference: payRef,
        allocations: unpaidOrders,
        allowUnallocated: true
      });

      alert('Pembayaran berhasil dicatat!');
      setPayModalOpen(false);
      setPayAmount('');
      setPayRef('');
      fetchDetail();
    } catch(err: any) {
      alert('Gagal: ' + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message));
    } finally {
      setIsPaying(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold">Detail Pelanggan</h1>
        <div className="flex-1" />
        <Button onClick={() => setPayModalOpen(true)}>
          <CreditCard className="w-4 h-4 mr-2" />
          Bayar Piutang
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Section 1: Customer Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> Info Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nama</p>
              <p className="font-medium">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telepon</p>
              <p className="font-medium">{customer.phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alamat</p>
              <p className="font-medium">{customer.address || "-"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Financial Summary */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Total Tagihan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financials?.totalSales)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Total Dibayar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(financials?.totalPaid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Sisa Piutang</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(financials?.totalOutstanding)}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 3: Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="orders">
            <FileText className="w-4 h-4 mr-2" />
            Sales Orders
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Banknote className="w-4 h-4 mr-2" />
            Riwayat Pembayaran
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Sales Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Order</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status Pembayaran</TableHead>
                      <TableHead className="text-right">Total Tagihan</TableHead>
                      <TableHead className="text-right">Sudah Dibayar</TableHead>
                      <TableHead className="text-right">Sisa Piutang</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!salesOrders || salesOrders.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24">Tidak ada order.</TableCell>
                      </TableRow>
                    ) : (
                      salesOrders.map((so: any) => (
                        <TableRow 
                          key={so.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push('/sales/orders/' + so.id)}
                        >
                          <TableCell className="font-medium">{so.order_number}</TableCell>
                          <TableCell>{formatDate(so.order_date)}</TableCell>
                          <TableCell>
                            <Badge variant={so.payment_status === 'PAID' ? 'default' : 'secondary'}>
                              {so.payment_status || "UNPAID"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(so.total_amount)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(so.paid_amount)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(so.outstanding)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Ref / Pembayaran</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!payments || payments.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">Tidak ada riwayat pembayaran.</TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.payment_number}
                            {p.reference && <span className="block text-xs text-muted-foreground">{p.reference}</span>}
                          </TableCell>
                          <TableCell>{formatDate(p.payment_date)}</TableCell>
                          <TableCell>{p.payment_method}</TableCell>
                          <TableCell>{p.notes || "-"}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(p.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
