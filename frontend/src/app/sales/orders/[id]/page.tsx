'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatIDR } from '@/lib/utils';
import { 
  ArrowLeft, Truck, Receipt, CheckCircle2, AlertTriangle, ExternalLink,
  PackageCheck, FileText, Calendar, Building, Clock, Info, Loader2, Check,
  Send, Printer, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function SalesOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sales/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      console.error(err);
      toast({ title: 'Gagal', description: 'Gagal memuat data Pesanan Penjualan', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Selesai</Badge>;
      case 'CONFIRMED':
        return <Badge className="bg-blue-500/10 text-blue-600 border-0">Dikonfirmasi</Badge>;
      case 'PENDING':
        return <Badge className="bg-amber-500/10 text-amber-600 border-0">Menunggu</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-rose-500/10 text-rose-600 border-0">Dibatalkan</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Draft'}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Pesanan penjualan tidak ditemukan.</p>
        <Button variant="outline" onClick={() => router.push('/sales/orders')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/sales/orders')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {order.order_number}
              </h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dibuat pada {new Date(order.order_date || order.created_at).toLocaleDateString('id-ID')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {order.status !== 'CANCELLED' && (
            <>
              <Link href={`/sales/deliveries/create?salesOrderId=${order.id}`}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm">
                  <Truck className="w-4 h-4" /> Kirim Barang (DO)
                </Button>
              </Link>
              <Link href={`/sales/invoices/create?salesOrderId=${order.id}`}>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
                  <Receipt className="w-4 h-4" /> Buat Faktur
                </Button>
              </Link>
            </>
          )}
          <Link href={`/sales/orders/${id}/print`} target="_blank">
            <Button variant="outline" className="gap-1.5">
              <Printer className="w-4 h-4" /> Cetak Pesanan
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Informasi Pelanggan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="font-semibold text-foreground text-base">{order.customer?.name || 'Pelanggan Umum'}</div>
            {order.customer?.phone && <div className="text-muted-foreground">{order.customer.phone}</div>}
            {order.customer?.email && <div className="text-muted-foreground">{order.customer.email}</div>}
            {order.billing_address && <div className="text-xs text-muted-foreground pt-1 border-t">{order.billing_address}</div>}
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Rincian Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Syarat Pembayaran:</span>
              <span className="font-medium">{order.payment_terms || 'Net 30'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mata Uang:</span>
              <span className="font-medium">{order.currency || 'IDR'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status Pengiriman:</span>
              <Badge variant="outline" className="text-xs">{order.delivery_status || 'PENDING'}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status Penagihan:</span>
              <Badge variant="outline" className="text-xs">{order.invoice_status || 'PENDING'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Ringkasan Nilai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatIDR(order.subtotal || order.total_amount)}</span>
            </div>
            {Number(order.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Diskon:</span>
                <span>-{formatIDR(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pajak (PPN):</span>
              <span className="font-medium">{formatIDR(order.tax || 0)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-base text-foreground">
              <span>Total Pesanan:</span>
              <span className="text-emerald-600">{formatIDR(order.total_amount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Daftar Produk Pesanan</CardTitle>
          <CardDescription>Rincian kuantitas, harga satuan, dan progres pemenuhan barang</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Kuantitas</TableHead>
                <TableHead className="text-right">Harga Satuan</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-center">Terkirim</TableHead>
                <TableHead className="text-center">Diretur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(order.items || []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div>{item.product?.name || 'Produk'}</div>
                    <div className="text-xs text-muted-foreground">{item.product?.sku || item.product?.code || '-'}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.qty}</TableCell>
                  <TableCell className="text-right">{formatIDR(item.unit_price)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatIDR(item.subtotal)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.delivered_qty >= item.qty ? 'default' : 'outline'} className="text-xs">
                      {item.delivered_qty || 0} / {item.qty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-rose-600 font-medium text-xs">
                    {item.returned_qty || 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
