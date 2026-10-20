'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api, { CRMAPI, FinanceAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { formatCurrency } from '@/lib/utils';
import { User, Activity, FileText, ShoppingCart, Truck, CreditCard, CheckCircle, AlertTriangle, ArrowLeft, Building2, MapPin, Phone, Mail, FileClock, Navigation } from 'lucide-react';
import { Button } from"@/components/ui/button";
import { toast } from 'sonner';
import { Badge } from"@/components/ui/badge";
import Link from 'next/link';

export default function Customer360Page() {
 const params = useParams();
 const router = useRouter();
 const partnerId = params.id as string;
 const [data, setData] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payMethod, setPayMethod] = useState('Transfer');
  const [payRef, setPayRef] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [actType, setActType] = useState('NOTE');
  const [actTitle, setActTitle] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [isSavingAct, setIsSavingAct] = useState(false);
  const [isCreatingInv, setIsCreatingInv] = useState<string | null>(null);
  const [nettingModalOpen, setNettingModalOpen] = useState(false);
  const [nettingAmount, setNettingAmount] = useState('');
  const [nettingNotes, setNettingNotes] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStartDate, setSalesStartDate] = useState('');
  const [salesEndDate, setSalesEndDate] = useState('');

  const handleCreateInvoice = async (soId: string) => {
    setIsCreatingInv(soId);
    try {
      await FinanceAPI.createInvoiceFromSO({ salesOrderId: soId });
      toast.success('Faktur berhasil dibuat!');
      const res = await CRMAPI.getPartner360(partnerId);
      setData(res); // Refresh all data to update the invoices table
    } catch(err: any) {
      toast.error('Gagal membuat faktur: ' + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message));
    } finally {
      setIsCreatingInv(null);
    }
  };

  const handleSaveActivity = async () => {
    if (!actTitle) return toast.error('Judul aktivitas wajib diisi');
    setIsSavingAct(true);
    try {
      await CRMAPI.createActivity({
        partner_id: partnerId,
        type: actType,
        title: actTitle,
        description: actDesc,
      });
      toast.success('Aktivitas berhasil dicatat!');
      setActivityModalOpen(false);
      setActTitle('');
      setActDesc('');
      
      const res = await CRMAPI.getPartner360(partnerId);
      setData(res);
    } catch(err: any) {
      toast.error('Gagal: ' + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message));
    } finally {
      setIsSavingAct(false);
    }
  };

  const handleNetting = async () => {
    try {
      if(!nettingAmount || Number(nettingAmount) <= 0) return toast.error('Nominal invalid');
      await api.post('/finance/netting', { partner_id: partnerId, amount: Number(nettingAmount), notes: nettingNotes });
      setNettingModalOpen(false);
      setNettingAmount('');
      const res = await CRMAPI.getPartner360(partnerId);
      setData(res);
      toast.success('Kompensasi berhasil!');
    } catch(err:any) {
      toast.error('Gagal: ' + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message));
    }
  };
  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) return toast.error('Nominal tidak valid');
    setIsPaying(true);
    try {
      const unpaidOrders: any[] = [];
      let remainingToAllocate = Number(payAmount);
      
      const sortedOrders = [...(data?.sales?.orders || [])].sort((a,b) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());
      
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
        partnerId,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        reference: payRef,
        allocations: unpaidOrders,
        allowUnallocated: true
      });

      toast.success('Pembayaran berhasil!');
      setPayModalOpen(false);
      setPayAmount('');
      setPayRef('');
      
      const res = await CRMAPI.getPartner360(partnerId);
      setData(res);
    } catch(err: any) {
      toast.error('Gagal: ' + ((err.response?.data?.error?.message || err.response?.data?.message) || err.message));
    } finally {
      setIsPaying(false);
    }
  };

 useEffect(() => {
 const fetchC360 = async () => {
 try {
 setLoading(true);
 setError(null);
 const res = await CRMAPI.getPartner360(partnerId);
 setData(res);
 } catch (err: any) {
 console.error(err);
 setError(err.message || 'Failed to load customer data.');
 } finally {
 setLoading(false);
 }
 };
 fetchC360();
 }, [partnerId]);

 if (loading) return (
 <div className="p-4 md:p-8 space-y-4 animate-pulse">
 <div className="h-20 bg-muted/50 rounded-lg"></div>
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="h-24 bg-muted/50 rounded-lg"></div><div className="h-24 bg-muted/50 rounded-lg"></div><div className="h-24 bg-muted/50 rounded-lg"></div><div className="h-24 bg-muted/50 rounded-lg"></div></div>
 <div className="h-64 bg-muted/50 rounded-lg"></div>
 </div>
 );
 if (error) return (
 <div className="p-4 md:p-8 text-center border border-red-100 bg-red-50 text-red-600 rounded-lg m-6">
 <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
 <p className="font-semibold">{error}</p>
 <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
 </div>
 );
 if (!data?.profile) return <div className="p-4 md:p-8 text-center text-red-500">Customer not found.</div>;

 const { profile, sales, finance, crm, timeline } = data;
  const quotations = data.quotations || [];
  const deliveries = data.deliveries || [];

 // Enhance timeline with unified data if backend timeline is incomplete
 let unifiedTimeline = [...(timeline || [])];
 
 // Create a composed chronological feed
 const feed = unifiedTimeline.map((t: any) => ({
 id: t.ref,
 type: t.type,
 date: new Date(t.date),
 title: t.type === 'ORDER' ? `Sales Order Created` : t.type === 'INVOICE' ? 'Invoice Posted' : 'Opportunity Created'
 })).sort((a, b) => b.date.getTime() - a.date.getTime());

 // Add more from actual arrays if not in timeline
 const allEvents = [
 ...crm.activities.map((a:any) => ({ id: a.id, type: 'ACTIVITY', date: new Date(a.created_at), title: `Activity: ${a.title} (${a.type})` })),
 ...quotations.map((q:any) => ({ id: q.id, type: 'QUOTATION', date: new Date(q.created_at), title: `Quotation ${q.quotation_number} created` })),
 ...deliveries.map((d:any) => ({ id: d.id, type: 'DELIVERY', date: new Date(d.created_at), title: `Delivery ${d.delivery_number} processed` })),
 ...finance.payments.map((p:any) => ({ id: p.id, type: 'PAYMENT', date: new Date(p.created_at), title: `Payment received: ${formatCurrency(p.amount)}` })),
 ...feed
 ].sort((a, b) => b.date.getTime() - a.date.getTime());
  const filteredQuotations = sales?.quotations?.filter((q: any) => {
    const matchSearch = q.quotation_number?.toLowerCase().includes(salesSearch.toLowerCase());
    const qDate = new Date(q.quotation_date || q.created_at);
    const matchStart = salesStartDate ? qDate >= new Date(salesStartDate) : true;
    const matchEnd = salesEndDate ? qDate <= new Date(salesEndDate) : true;
    return matchSearch && matchStart && matchEnd;
  }) || [];

  const filteredOrders = sales?.orders?.filter((so: any) => {
    const matchSearch = so.order_number?.toLowerCase().includes(salesSearch.toLowerCase());
    const soDate = new Date(so.order_date || so.created_at);
    const matchStart = salesStartDate ? soDate >= new Date(salesStartDate) : true;
    const matchEnd = salesEndDate ? soDate <= new Date(salesEndDate) : true;
    return matchSearch && matchStart && matchEnd;
  }) || [];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
 {/* Action Bar */}
 <div className="flex items-center gap-4 text-sm text-muted-foreground">
 <button onClick={() => router.push('/crm/partners')} className="flex items-center hover:text-foreground transition-colors">
 <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Daftar Pelanggan
 </button>
 </div>

 {/* Customer Header */}
 <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 bg-card p-6 rounded-lg shadow-sm border">
 <div>
 <div className="flex items-center gap-3 mb-2">
 <h1 className="text-2xl font-bold">{profile.name}</h1>
 <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-primary">Active</Badge>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground">
 <div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> {profile.code}</div>
 <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {profile.phone || '-'}</div>
 <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {profile.email || '-'}</div>
 <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {profile.address || 'Tidak ada alamat'}</div>
 </div>
 </div>
 <div className="flex flex-wrap gap-2 md:justify-end">
 <Button variant="outline" size="sm" onClick={() => router.push('/sales/quotations/create?partner_id=' + partnerId)}><FileText className="w-4 h-4 mr-2" /> Buat Penawaran</Button>
 <Button variant="default" size="sm"><Activity className="w-4 h-4 mr-2" /> Catat Aktivitas</Button>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">
 <Card className="shadow-sm">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced (LTV)</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{formatCurrency(sales.totalSales || 0)}</div>
 </CardContent>
 </Card>
 <Card className="shadow-sm">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">Total Pesanan</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{sales.orderCount}</div>
 </CardContent>
 </Card>
 <Card className="shadow-sm">
 <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
 <CardTitle className="text-sm font-medium text-muted-foreground">Total Piutang</CardTitle>
 {finance.outstandingAmount > 0 && <Button variant="outline" size="sm" className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => { setPayAmount(finance.outstandingAmount || 0); setPayModalOpen(true); }}>Bayar</Button>}
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-destructive">{formatCurrency(finance.outstandingAmount || 0)}</div>
 </CardContent>
 </Card>
  <Card className="shadow-sm">
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">Hutang & Kredit Supplier</CardTitle>
      </CardHeader>
      <CardContent>
        {finance.outstandingAp < 0 ? (
          <>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(Math.abs(finance.outstandingAp))} <span className="text-sm font-normal">(Kredit Supplier)</span></div>
            <p className="text-xs text-muted-foreground mt-1">Hutang Pokok: Rp0</p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(finance.outstandingAp || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Hutang Pokok</p>
          </>
        )}
      </CardContent>
  </Card>
  <Card className="shadow-sm bg-primary/5">
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm font-medium text-primary">Net Balance</CardTitle>
      {(finance.outstandingAmount > 0 && finance.outstandingAp > 0) && (
          <Button type="button" size="sm" onClick={() => setNettingModalOpen(true)}>Kompensasi</Button>
        )}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-primary">{formatCurrency(finance.netBalance || 0)}</div>
      <p className="text-xs text-muted-foreground mt-1">{(finance.netBalance > 0) ? 'Perusahaan berpiutang' : (finance.netBalance < 0 ? 'Perusahaan berhutang' : 'Lunas')}</p>
    </CardContent>
  </Card>
  
 <Card className="shadow-sm">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">Peluang Aktif</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-primary">{crm.activeOpportunities}</div>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="overview" className="w-full">
 <div className="overflow-x-auto pb-2">
 <TabsList className="bg-card border w-max md:w-full justify-start md:justify-center">
 <TabsTrigger value="overview">Ringkasan & Riwayat</TabsTrigger>
 <TabsTrigger value="crm">CRM</TabsTrigger>
 <TabsTrigger value="sales">Penjualan</TabsTrigger>
 <TabsTrigger value="purchases">Pembelian</TabsTrigger>
 <TabsTrigger value="deliveries">Pengiriman</TabsTrigger>
 <TabsTrigger value="finance">Keuangan</TabsTrigger>
 </TabsList>
 </div>
 
 {/* OVERVIEW */}
 <TabsContent value="overview" className="space-y-6 mt-4">
 <Card className="shadow-sm">
 <CardHeader><CardTitle className="text-[16px] font-semibold">Unified Timeline</CardTitle></CardHeader>
 <CardContent>
 <div className="space-y-6 relative border-l-2 border-muted ml-3">
 {allEvents.slice(0, 50).map((event: any, i: number) => (
 <div key={`${event.id}-${i}`} className="mb-6 ml-6 group">
 <span className="absolute flex items-center justify-center w-8 h-8 bg-background rounded-full -left-4 ring-4 ring-muted/30 group-hover:ring-primary/20 transition-all">
 {event.type === 'INVOICE' || event.type === 'PAYMENT' ? <CreditCard className="w-4 h-4 text-primary" /> :
 event.type === 'DELIVERY' ? <Truck className="w-4 h-4 text-orange-600" /> :
 event.type === 'ORDER' || event.type === 'QUOTATION' ? <ShoppingCart className="w-4 h-4 text-blue-600" /> :
 event.type === 'ACTIVITY' ? <Activity className="w-4 h-4 text-primary" /> :
 <FileClock className="w-4 h-4 text-purple-600" />}
 </span>
 <div className="p-3 bg-muted/20 border rounded-md">
 <h3 className="text-sm font-semibold text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
 {event.title}
 <Badge variant="outline" className="text-xs font-normal">{event.type}</Badge>
 </h3>
 <time className="block mt-1 text-xs text-muted-foreground">
 {event.date.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
 </time>
 </div>
 </div>
 ))}
 {allEvents.length === 0 && (
 <div className="text-muted-foreground ml-6 py-4 flex items-center gap-2">
 <FileClock className="h-4 w-4" /> No timeline events found.
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 {/* CRM */}
 <TabsContent value="crm" className="space-y-4 mt-4">
 <Card className="shadow-sm">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-[16px] font-semibold">Opportunities</CardTitle>
 <Link href="/crm/opportunities"><Button variant="outline" size="sm">Kelola <Navigation className="w-3 h-3 ml-1" /></Button></Link>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left whitespace-nowrap">
 <thead className="bg-muted/50 border-b">
 <tr>
 <th className="px-4 py-3 font-medium">Title</th>
 <th className="px-4 py-3 font-medium">Stage</th>
 <th className="px-4 py-3 font-medium">Expected Value</th>
 <th className="px-4 py-3 font-medium">Close Tanggal</th>
 </tr>
 </thead>
 <tbody>
 {crm.opportunities.map((o: any) => (
 <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
 <td className="px-4 py-3 font-medium">{o.title}</td>
 <td className="px-4 py-3"><Badge variant="outline">{o.stage}</Badge></td>
 <td className="px-4 py-3">{formatCurrency(o.expected_value)}</td>
 <td className="px-4 py-3">{o.expected_close_date ? new Date(o.expected_close_date).toLocaleDateString() : '-'}</td>
 </tr>
 ))}
 {crm.activeOpportunities === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No opportunities found.</td></tr>}
 </tbody>
 </table>
 </CardContent>
 </Card>

 <Card className="shadow-sm">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-[16px] font-semibold">Activities</CardTitle>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left whitespace-nowrap">
 <thead className="bg-muted/50 border-b">
 <tr>
 <th className="px-4 py-3 font-medium">Type</th>
 <th className="px-4 py-3 font-medium">Title</th>
 <th className="px-4 py-3 font-medium">Status</th>
 <th className="px-4 py-3 font-medium">Due Tanggal</th>
 </tr>
 </thead>
 <tbody>
 {crm.activities.map((act: any) => (
 <tr key={act.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
 <td className="px-4 py-3"><Badge variant="secondary">{act.type}</Badge></td>
 <td className="px-4 py-3">{act.title}</td>
 <td className="px-4 py-3">{act.status}</td>
 <td className="px-4 py-3">{act.due_date ? new Date(act.due_date).toLocaleDateString() : '-'}</td>
 </tr>
 ))}
 {crm.activities.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No activities found.</td></tr>}
 </tbody>
 </table>
 </CardContent>
 </Card>
 </TabsContent>

 {/* SALES & QUOTATIONS */}
 <TabsContent value="sales" className="space-y-4 mt-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Input 
            placeholder="Cari Quotation / Order #..." 
            value={salesSearch} 
            onChange={(e) => setSalesSearch(e.target.value)} 
            className="max-w-sm" 
          />
          <div className="flex gap-2 items-center">
            <Input 
              type="date" 
              value={salesStartDate} 
              onChange={(e) => setSalesStartDate(e.target.value)} 
            />
            <span className="text-muted-foreground">-</span>
            <Input 
              type="date" 
              value={salesEndDate} 
              onChange={(e) => setSalesEndDate(e.target.value)} 
            />
          </div>
        </div>
 <Card className="shadow-sm">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-[16px] font-semibold">Quotations</CardTitle>
 <Link href="/sales/quotations"><Button variant="outline" size="sm">Kelola <Navigation className="w-3 h-3 ml-1" /></Button></Link>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left whitespace-nowrap">
 <thead className="bg-muted/50 border-b">
 <tr>
 <th className="px-4 py-3 font-medium">Quotation #</th>
 <th className="px-4 py-3 font-medium">Tanggal</th>
 <th className="px-4 py-3 font-medium">Status</th>
 <th className="px-4 py-3 font-medium text-right">Total</th>
 </tr>
 </thead>
 <tbody>
 {filteredQuotations.map((q: any) => (
 <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
 <td className="px-4 py-3 font-mono text-xs">{q.quotation_number}</td>
 <td className="px-4 py-3">{new Date(q.quotation_date || q.created_at).toLocaleDateString()}</td>
 <td className="px-4 py-3"><Badge variant="outline">{q.status}</Badge></td>
 <td className="px-4 py-3 text-right">{formatCurrency(q.total_amount)}</td>
 </tr>
 ))}
 {filteredQuotations.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No quotations found.</td></tr>}
 </tbody>
 </table>
 </CardContent>
 </Card>

 <Card className="shadow-sm">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-[16px] font-semibold">Sales Orders</CardTitle>
 <div className="flex gap-2"><Link href={`/pos/new-transaction?customer_id=${partnerId}`}><Button size="sm" className="bg-primary text-primary-foreground">+ Tambah Order</Button></Link><Link href="/sales/orders"><Button variant="outline" size="sm">Kelola <Navigation className="w-3 h-3 ml-1" /></Button></Link></div>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left whitespace-nowrap">
 <thead className="bg-muted/50 border-b">
 <tr>
 <th className="px-4 py-3 font-medium">Order #</th>
 <th className="px-4 py-3 font-medium">Tanggal</th>
 <th className="px-4 py-3 font-medium">Status Order</th>
 <th className="px-4 py-3 font-medium">Status Bayar</th>
 <th className="px-4 py-3 font-medium text-right">Total</th>
 <th className="px-4 py-3 font-medium text-right">Sisa Piutang</th>
 <th className="px-4 py-3 font-medium text-right">Aksi</th>
 </tr>
 </thead>
 <tbody>
 {filteredOrders.map((so: any) => {
   let paid = so.allocations?.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0) || 0;
   const linkedInvs = (data?.finance?.invoices || []).filter((i: any) => i.sales_order_id === so.id);
   linkedInvs.forEach((inv: any) => { paid += Number(inv.paid_amount || 0) });
   const sisa = Math.max(0, (so.total_amount || 0) - paid);
   return (
 <tr key={so.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/sales/orders?id=${so.id}`}>
 <td className="px-4 py-3 font-mono text-xs">{so.order_number}</td>
 <td className="px-4 py-3">{new Date(so.order_date || so.created_at).toLocaleDateString()}</td>
 <td className="px-4 py-3"><Badge variant="outline">{so.status}</Badge></td>
 <td className="px-4 py-3">
   <span className={`px-2 py-1 rounded-full text-xs font-bold ${so.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : so.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
     {so.payment_status === 'PAID' ? 'LUNAS' : so.payment_status === 'PARTIALLY_PAID' ? 'PIUTANG' : 'BELUM BAYAR'}
   </span>
 </td>
 <td className="px-4 py-3 text-right">{formatCurrency(so.total_amount)}</td>
 <td className={`px-4 py-3 text-right font-semibold ${sisa > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{sisa > 0 ? formatCurrency(sisa) : '-'}</td>
   <td className="px-4 py-3 text-right">
     {so.invoice_status !== 'INVOICED' ? (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleCreateInvoice(so.id); }} disabled={isCreatingInv === so.id}>
          {isCreatingInv === so.id ? '...' : 'Buat Faktur'}
        </Button>
     ) : (
        <div className="flex flex-col items-end gap-1">
          {linkedInvs.length > 0 ? linkedInvs.map((inv: any) => (
             <Badge key={inv.id} variant="secondary" className="cursor-pointer hover:bg-muted" onClick={(e) => { e.stopPropagation(); const tab = document.querySelector('[value="finance"]'); if(tab) (tab as HTMLElement).click(); }}>
               {inv.invoice_number}
             </Badge>
          )) : (
             <span className="text-muted-foreground text-xs">Sudah Difaktur</span>
          )}
        </div>
     )}
   </td>
 </tr>
   );
 })}
 {filteredOrders.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Belum ada transaksi.</td></tr>}
 </tbody>
 </table>
 </CardContent>
 </Card>
 </TabsContent>

 {/* DELIVERIES */}
 <TabsContent value="deliveries" className="mt-4">
 <Card className="shadow-sm">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-[16px] font-semibold">Pengiriman</CardTitle>
 <Link href="/sales/deliveries"><Button variant="outline" size="sm">Kelola <Navigation className="w-3 h-3 ml-1" /></Button></Link>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left whitespace-nowrap">
 <thead className="bg-muted/50 border-b">
 <tr>
 <th className="px-4 py-3 font-medium">Delivery #</th>
 <th className="px-4 py-3 font-medium">Tanggal</th>
 <th className="px-4 py-3 font-medium">Status</th>
 </tr>
 </thead>
 <tbody>
 {sales.deliveries.map((d: any) => (
 <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
 <td className="px-4 py-3 font-mono text-xs">{d.delivery_number}</td>
 <td className="px-4 py-3">{new Date(d.delivery_date || d.created_at).toLocaleDateString()}</td>
 <td className="px-4 py-3"><Badge variant="outline">{d.status}</Badge></td>
 </tr>
 ))}
 {sales.deliveries.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No deliveries found.</td></tr>}
 </tbody>
 </table>
 </CardContent>
 </Card>
 </TabsContent>

 {/* FINANCE */}
 <TabsContent value="finance" className="space-y-4 mt-4">
 <Card className="shadow-sm">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-[16px] font-semibold">Faktur Tagihan</CardTitle>
 <Link href="/finance/invoices"><Button variant="outline" size="sm">Kelola <Navigation className="w-3 h-3 ml-1" /></Button></Link>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left whitespace-nowrap">
 <thead className="bg-muted/50 border-b">
 <tr>
 <th className="px-4 py-3 font-medium">Nomor Faktur</th>
<th className="px-4 py-3 font-medium">Tipe</th>
 <th className="px-4 py-3 font-medium">Tanggal</th>
 <th className="px-4 py-3 font-medium">Status</th>
 <th className="px-4 py-3 font-medium text-right">Total</th>
 <th className="px-4 py-3 font-medium text-right">Sisa Tagihan</th>
 </tr>
 </thead>
 <tbody>
 {finance.invoices.map((inv: any) => (
 <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
 <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
<td className="px-4 py-3 text-xs">{inv.type === "AR" ? "Penjualan (AR)" : "Pembelian (AP)"}</td>
 <td className="px-4 py-3">{new Date(inv.invoice_date || inv.created_at).toLocaleDateString()}</td>
 <td className="px-4 py-3"><Badge variant="outline">{inv.status}</Badge></td>
 <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.total)}</td>
 <td className="px-4 py-3 text-right text-destructive font-medium">{formatCurrency(inv.remaining_amount)}</td>
 </tr>
 ))}
 {finance.invoices.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Tidak ada faktur tagihan.</td></tr>}
 </tbody>
 </table>
 </CardContent>
 </Card>
 
 <Card className="shadow-sm">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-[16px] font-semibold">Riwayat Pembayaran Masuk</CardTitle>
 <Link href="/finance/payments"><Button variant="outline" size="sm">Kelola <Navigation className="w-3 h-3 ml-1" /></Button></Link>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left whitespace-nowrap">
 <thead className="bg-muted/50 border-b">
 <tr>
 <th className="px-4 py-3 font-medium">Nomor Pembayaran</th>
 <th className="px-4 py-3 font-medium">Tanggal</th>
 <th className="px-4 py-3 font-medium">Metode</th>
 <th className="px-4 py-3 font-medium text-right">Jumlah</th>
 </tr>
 </thead>
 <tbody>
 {finance.payments.map((p: any) => (
 <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
 <td className="px-4 py-3 font-mono text-xs">{p.payment_number}</td>
 <td className="px-4 py-3">{new Date(p.payment_date || p.created_at).toLocaleDateString()}</td>
 <td className="px-4 py-3"><Badge variant="outline">{p.method}</Badge></td>
 <td className="px-4 py-3 text-right font-medium text-primary">{formatCurrency(p.amount)}</td>
 </tr>
 ))}
 {finance.payments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Tidak ada riwayat pembayaran.</td></tr>}
 </tbody>
 </table>
 </CardContent>
 </Card>
  </TabsContent>

 {/* PURCHASES */}
 <TabsContent value="purchases" className="space-y-4 mt-4">
 <Card className="shadow-sm">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="text-[16px] font-semibold">Riwayat Pembelian</CardTitle>
 <div className="flex gap-2">
     <Link href={`/inventory/purchase-fish/create?partner_id=${partnerId}`}>
       <Button size="sm">Tambah Pembelian</Button>
     </Link>
     <Link href="/purchasing/orders">
       <Button variant="outline" size="sm">Kelola <Navigation className="w-3 h-3 ml-1" /></Button>
     </Link>
   </div>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm text-left whitespace-nowrap">
 <thead className="bg-muted/50 border-b">
 <tr>
 <th className="px-4 py-3 font-medium">Order #</th>
 <th className="px-4 py-3 font-medium">Tanggal</th>
 <th className="px-4 py-3 font-medium">Status Order</th>
 <th className="px-4 py-3 font-medium">Status Pembayaran</th>
 <th className="px-4 py-3 font-medium text-right">Total</th>
 </tr>
 </thead>
 <tbody>
 {data?.purchases?.orders?.map((po: any) => (
 <tr key={po.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/purchasing/orders?id=${po.id}`}>
 <td className="px-4 py-3 font-mono text-xs">{po.order_number}</td>
 <td className="px-4 py-3">{new Date(po.order_date || po.created_at).toLocaleDateString()}</td>
 <td className="px-4 py-3"><Badge variant="outline">{po.status}</Badge></td>
 <td className="px-4 py-3">
   <Badge variant={po.payment_status === 'PAID' ? 'default' : 'secondary'}>{po.payment_status === 'PAID' ? 'LUNAS' : po.payment_status === 'PARTIALLY_PAID' ? 'SEBAGIAN' : 'BELUM BAYAR'}</Badge>
 </td>
 <td className="px-4 py-3 text-right font-medium">{formatCurrency(po.total_amount)}</td>
 </tr>
 ))}
 {(!data?.purchases?.orders || data.purchases.orders.length === 0) && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Tidak ada riwayat pembelian.</td></tr>}
 </tbody>
 </table>
 </CardContent>
 </Card>
 </TabsContent>
</Tabs>
 
      {/* PAYMENT MODAL */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Piutang</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Total Sisa Piutang</Label>
              <div className="text-xl font-bold text-destructive">
                {formatCurrency(data?.finance?.outstandingAmount || 0)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nominal Pembayaran (Rp)</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="Masukkan nominal"
              />
            </div>
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select value={payMethod} onValueChange={(val: any) => setPayMethod(val || "")}>
                <SelectTrigger><SelectValue placeholder="Pilih Metode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tunai">Tunai</SelectItem>
                  <SelectItem value="Transfer">Transfer Bank</SelectItem>
                  <SelectItem value="Giro">Bilyet Giro / Cek</SelectItem>
                  <SelectItem value="QRIS">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Referensi / Catatan (Opsional)</Label>
              <Input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Cth: Transfer BCA a/n Budi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Batal</Button>
            <Button onClick={handlePay} disabled={isPaying || !payAmount}>
              {isPaying ? 'Menyimpan...' : 'Simpan Pembayaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ACTIVITY MODAL */}
      <Dialog open={activityModalOpen} onOpenChange={setActivityModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Catat Aktivitas</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tipe Aktivitas</Label>
              <Select value={actType} onValueChange={(val: any) => setActType(val || "")}>
                <SelectTrigger><SelectValue placeholder="Pilih Tipe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTE">Catatan (Note)</SelectItem>
                  <SelectItem value="CALL">Telepon (Call)</SelectItem>
                  <SelectItem value="MEETING">Pertemuan (Meeting)</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                placeholder="Cth: Follow up tagihan"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi / Hasil</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={actDesc}
                onChange={(e) => setActDesc(e.target.value)}
                placeholder="Tuliskan detail aktivitas di sini..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityModalOpen(false)}>Batal</Button>
            <Button onClick={handleSaveActivity} disabled={isSavingAct || !actTitle}>
              {isSavingAct ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      

        {/* NETTING MODAL */}
        <Dialog open={nettingModalOpen} onOpenChange={setNettingModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Kompensasi Hutang/Piutang</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                Fitur ini akan memotong silang Piutang (AR) dan Hutang (AP) untuk nelayan/partner ini secara otomatis dari saldo tertua.
              </p>
              <div className="space-y-2">
                <Label>Maksimal Kompensasi yang bisa dilakukan: {formatCurrency(Math.min(finance?.outstandingAmount || 0, finance?.outstandingAp || 0))}</Label>
                <Input
                  type="number"
                  placeholder="Nominal Kompensasi"
                  value={nettingAmount}
                  onChange={(e) => setNettingAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Catatan Tambahan</Label>
                <Input
                  type="text"
                  placeholder="Opsional..."
                  value={nettingNotes}
                  onChange={(e) => setNettingNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNettingModalOpen(false)}>Batal</Button>
              <Button onClick={handleNetting} disabled={!nettingAmount}>
                Proses Kompensasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
