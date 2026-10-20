"use client";

import { useEffect, useState } from "react";
import { ShipmentAPI } from "@/lib/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Truck, ArrowRight, Search, FileBox, Printer, Trash2, CheckCircle2, MapPin, Calendar, UserSquare2, Layers, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function ShipmentListPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchShipments = () => {
    setLoading(true);
    ShipmentAPI.getShipments()
      .then((res: any) => {
        setShipments(res?.data || res || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus data muat ini?")) return;
    try {
      setDeletingId(id);
      await ShipmentAPI.deleteShipment(id);
      fetchShipments();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || "Gagal menghapus data");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = (Array.isArray(shipments) ? shipments : []).filter(s => {
    const q = search.toLowerCase();
    const num = (s.shipmentNumber || s.code || "").toLowerCase();
    const fuso = (s.fusoName || "").toLowerCase();
    const police = (s.policeNumber || s.vehicle?.licensePlate || s.vehicle?.name || "").toLowerCase();
    const driver = (s.driverName || s.driver?.name || "").toLowerCase();
    const dest = (s.destinationName || s.customer?.name || "").toLowerCase();
    const wh = (s.warehouse?.name || "").toLowerCase();
    return num.includes(q) || fuso.includes(q) || police.includes(q) || driver.includes(q) || dest.includes(q) || wh.includes(q);
  });

  // Calculate Aggregates
  const totalArmada = shipments.length;
  const totalPcs = shipments.reduce((sum, s) => sum + (s.totalPcs || (s.items || []).reduce((sub: number, i: any) => sub + (i.quantityPcs || 0), 0)), 0);
  const totalM3 = shipments.reduce((sum, s) => sum + (s.totalVolumeM3 || (s.items || []).reduce((sub: number, i: any) => sub + (i.volumeM3 || 0), 0)), 0);

  // Breakdown by Category & Species
  let totalM3Balok = 0;
  let totalM3Reng = 0;
  let totalM3Meranti = 0;
  let totalM3Bengkirai = 0;

  shipments.forEach(s => {
    (s.items || []).forEach((item: any) => {
      const vol = item.volumeM3 || 0;
      const cat = (item.productCategory || "BALOK").toUpperCase();
      const spec = (item.species || item.timberVariant?.species || "").toUpperCase();

      if (cat.includes("BALOK") || cat === "MAIN") totalM3Balok += vol;
      else if (cat.includes("RENG") || cat.includes("PAPAN") || cat === "LOKAL") totalM3Reng += vol;

      if (spec.includes("MERANTI") || spec.includes("MRT")) totalM3Meranti += vol;
      else if (spec.includes("BENGKIRAI") || spec.includes("BKR")) totalM3Bengkirai += vol;
    });
  });

  return (
    <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-12 px-4 md:px-6 box-border">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Truck className="w-6 h-6" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Data Muat & Rekap Fuso (Ekspedisi)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Tally muatan armada truk/fuso ex-Kalteng, pencatatan ukuran T/L/P, dan rekapitulasi volume armada muat.
          </p>
        </div>
        <Link href="/inventory/shipment/create" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold h-10 shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Buat Tally Muat Fuso
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-600" /> Total Armada Muat
            </p>
            <p className="text-2xl font-bold text-foreground">{totalArmada} Armada</p>
            <p className="text-xs text-muted-foreground mt-0.5">Truk Fuso / Kontainer</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> Total Batang / Pcs
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalPcs.toLocaleString("id-ID")} pcs</p>
            <p className="text-xs text-muted-foreground mt-0.5">Seluruh muatan armada</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600" /> Total Volume Muat
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Number(totalM3.toFixed(3))} m³</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalM3Meranti > 0 ? `MRT ${Number(totalM3Meranti.toFixed(2))} m³` : ""} {totalM3Bengkirai > 0 ? `• BKR ${Number(totalM3Bengkirai.toFixed(2))} m³` : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileBox className="w-3.5 h-3.5 text-purple-600" /> Balok vs Reng (M³)
            </p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {Number(totalM3Balok.toFixed(2))} / {Number(totalM3Reng.toFixed(2))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Balok (Main) / Reng (Papan)</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="tally" className="w-full space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="tally" className="font-semibold text-xs sm:text-sm">
            <Truck className="w-4 h-4 mr-2" /> Data Muat Armada (Tally)
          </TabsTrigger>
          <TabsTrigger value="rekap" className="font-semibold text-xs sm:text-sm">
            <BarChart2 className="w-4 h-4 mr-2" /> Rekapitulasi Muatan Fuso (Matrix)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Tally List */}
        <TabsContent value="tally" className="space-y-4">
          <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileBox className="w-4 h-4 text-primary" /> Daftar Surat Muat Fuso / Truk
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Klik baris muatan untuk membuka detail tally ukuran dan mencetak surat jalan muat
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-70" />
                  <Input 
                    type="search" 
                    placeholder="Cari No Fuso, Plat, Supir, Tujuan..." 
                    className="pl-9 bg-background h-10" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center">
                  <Truck className="w-10 h-10 text-muted-foreground mb-4 opacity-40" />
                  <h3 className="text-base font-semibold text-foreground mb-1">Belum ada data muatan fuso</h3>
                  <p className="text-[13.5px] text-muted-foreground max-w-sm mb-6">
                    Buat surat muat baru untuk mencatat kayu yang dimuat ke armada truk atau kontainer.
                  </p>
                  <Link href="/inventory/shipment/create">
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                      <Plus className="w-4 h-4 mr-2" /> Buat Tally Muat Pertama
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="p-3.5 px-5 text-left font-semibold text-muted-foreground">No. Muat / Fuso</th>
                        <th className="p-3.5 px-5 text-left font-semibold text-muted-foreground">Tgl Muat</th>
                        <th className="p-3.5 px-5 text-left font-semibold text-muted-foreground">Armada & Supir</th>
                        <th className="p-3.5 px-5 text-left font-semibold text-muted-foreground">Tujuan / Pembeli</th>
                        <th className="p-3.5 px-5 text-right font-semibold text-muted-foreground">Pcs</th>
                        <th className="p-3.5 px-5 text-right font-semibold text-muted-foreground">Volume M³</th>
                        <th className="p-3.5 px-5 text-center font-semibold text-muted-foreground">Status</th>
                        <th className="p-3.5 px-5 text-center font-semibold text-muted-foreground">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => {
                        const sNum = s.shipmentNumber || s.code || "-";
                        const fuso = s.fusoName || sNum;
                        const plate = s.policeNumber || s.vehicle?.licensePlate || s.vehicle?.name || "-";
                        const driver = s.driverName || s.driver?.name || "-";
                        const dest = s.destinationName || s.customer?.name || "-";
                        const pcs = s.totalPcs || (s.items || []).reduce((sum: number, i: any) => sum + (i.quantityPcs || 0), 0);
                        const m3 = s.totalVolumeM3 || (s.items || []).reduce((sum: number, i: any) => sum + (i.volumeM3 || 0), 0);
                        const isDraft = s.status === 'DRAFT' || !s.status;

                        return (
                          <tr 
                            key={s.id} 
                            onClick={() => router.push(`/inventory/shipment/${s.id}`)}
                            className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-5">
                              <div className="font-bold text-amber-600 dark:text-amber-400">{fuso}</div>
                              {fuso !== sNum && <div className="text-[11px] text-muted-foreground">{sNum}</div>}
                            </td>
                            <td className="py-3 px-5 font-medium text-muted-foreground">
                              {s.shipmentDate ? new Date(s.shipmentDate).toLocaleDateString("id-ID") : s.createdAt ? new Date(s.createdAt).toLocaleDateString("id-ID") : "-"}
                            </td>
                            <td className="py-3 px-5">
                              <div className="font-semibold text-foreground/90">{plate}</div>
                              <div className="text-[12px] text-muted-foreground">{driver}</div>
                            </td>
                            <td className="py-3 px-5 font-medium text-foreground/80">
                              {dest}
                            </td>
                            <td className="py-3 px-5 text-right font-semibold text-foreground">
                              {pcs.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3 px-5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {Number(m3.toFixed(4))}
                            </td>
                            <td className="py-3 px-5 text-center">
                              <Badge 
                                variant={s.status === 'CONFIRMED' ? 'default' : s.status === 'CANCELLED' ? 'destructive' : 'secondary'} 
                                className={s.status === 'CONFIRMED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                              >
                                {s.status || 'DRAFT'}
                              </Badge>
                            </td>
                            <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => router.push(`/inventory/shipment/${s.id}`)}
                                  className="h-8 px-2 text-primary hover:bg-primary/10"
                                  title="Lihat Detail"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => window.open(`/inventory/shipment/${s.id}/print`, '_blank')}
                                  className="h-8 px-2 text-muted-foreground hover:bg-slate-100"
                                  title="Cetak Tally Muat"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                {isDraft && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    disabled={deletingId === s.id}
                                    onClick={(e) => handleDelete(e, s.id)}
                                    className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                                    title="Hapus Draft"
                                  >
                                    {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Rekapitulasi Muatan Fuso (Matrix Excel 3) */}
        <TabsContent value="rekap" className="space-y-4">
          <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-amber-600" /> Rekapitulasi Muatan Fuso Ex-Kalteng
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Format matriks volume muat per armada (Meranti, Bengkirai, Balok vs Reng/Lokal) sesuai standar Excel operasional
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.print()}
                  className="font-semibold"
                >
                  <Printer className="w-4 h-4 mr-2" /> Cetak Rekapitulasi
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <table className="min-w-[950px] w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th rowSpan={2} className="border-r border-border p-3 text-left font-bold">No. Fuso / Armada</th>
                      <th rowSpan={2} className="border-r border-border p-3 text-left font-bold">No. Polisi & Supir</th>
                      <th colSpan={2} className="border-r border-border p-2 text-center font-bold bg-amber-50/50 dark:bg-amber-950/20">MERANTI (MRT)</th>
                      <th colSpan={2} className="border-r border-border p-2 text-center font-bold bg-blue-50/50 dark:bg-blue-950/20">BENGKIRAI (BKR)</th>
                      <th colSpan={2} className="border-r border-border p-2 text-center font-bold bg-purple-50/50 dark:bg-purple-950/20">KATEGORI (M³)</th>
                      <th colSpan={2} className="p-2 text-center font-bold bg-emerald-50/50 dark:bg-emerald-950/20">TOTAL MUATAN</th>
                      <th rowSpan={2} className="border-l border-border p-3 text-center font-bold">Status</th>
                    </tr>
                    <tr>
                      <th className="border-r border-border p-2 text-right font-semibold bg-amber-50/50 dark:bg-amber-950/20">PCS</th>
                      <th className="border-r border-border p-2 text-right font-semibold bg-amber-50/50 dark:bg-amber-950/20">M³</th>
                      <th className="border-r border-border p-2 text-right font-semibold bg-blue-50/50 dark:bg-blue-950/20">PCS</th>
                      <th className="border-r border-border p-2 text-right font-semibold bg-blue-50/50 dark:bg-blue-950/20">M³</th>
                      <th className="border-r border-border p-2 text-right font-semibold bg-purple-50/50 dark:bg-purple-950/20">BALOK</th>
                      <th className="border-r border-border p-2 text-right font-semibold bg-purple-50/50 dark:bg-purple-950/20">RENG</th>
                      <th className="border-r border-border p-2 text-right font-bold bg-emerald-50/50 dark:bg-emerald-950/20">PCS</th>
                      <th className="p-2 text-right font-bold bg-emerald-50/50 dark:bg-emerald-950/20">M³</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-8 text-muted-foreground">
                          Belum ada data muatan fuso.
                        </td>
                      </tr>
                    ) : (
                      shipments.map((s, idx) => {
                        let mrtPcs = 0, mrtM3 = 0;
                        let bkrPcs = 0, bkrM3 = 0;
                        let balokM3 = 0, rengM3 = 0;

                        (s.items || []).forEach((item: any) => {
                          const vol = item.volumeM3 || 0;
                          const pcs = item.quantityPcs || 0;
                          const spec = (item.species || item.timberVariant?.species || "").toUpperCase();
                          const cat = (item.productCategory || "BALOK").toUpperCase();

                          if (spec.includes("BENGKIRAI") || spec.includes("BKR")) {
                            bkrPcs += pcs;
                            bkrM3 += vol;
                          } else {
                            // Default or Meranti
                            mrtPcs += pcs;
                            mrtM3 += vol;
                          }

                          if (cat.includes("RENG") || cat.includes("PAPAN") || cat === "LOKAL") {
                            rengM3 += vol;
                          } else {
                            balokM3 += vol;
                          }
                        });

                        const totPcs = mrtPcs + bkrPcs;
                        const totM3 = mrtM3 + bkrM3;
                        const fusoTitle = s.fusoName || s.shipmentNumber || `Fuso ${idx + 1}`;
                        const plate = s.policeNumber || s.vehicle?.licensePlate || "-";
                        const driver = s.driverName || s.driver?.name || "-";

                        return (
                          <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-3 font-bold text-amber-600 dark:text-amber-400 border-r border-border">
                              {fusoTitle}
                            </td>
                            <td className="p-3 border-r border-border">
                              <div className="font-semibold">{plate}</div>
                              <div className="text-[11px] text-muted-foreground">{driver}</div>
                            </td>
                            {/* Meranti */}
                            <td className="p-3 text-right border-r border-border bg-amber-50/20 dark:bg-amber-950/10 font-medium">{mrtPcs}</td>
                            <td className="p-3 text-right border-r border-border bg-amber-50/20 dark:bg-amber-950/10 font-bold text-amber-700 dark:text-amber-400">{Number(mrtM3.toFixed(4))}</td>
                            {/* Bengkirai */}
                            <td className="p-3 text-right border-r border-border bg-blue-50/20 dark:bg-blue-950/10 font-medium">{bkrPcs}</td>
                            <td className="p-3 text-right border-r border-border bg-blue-50/20 dark:bg-blue-950/10 font-bold text-blue-700 dark:text-blue-400">{Number(bkrM3.toFixed(4))}</td>
                            {/* Balok vs Reng */}
                            <td className="p-3 text-right border-r border-border bg-purple-50/20 dark:bg-purple-950/10 font-medium">{Number(balokM3.toFixed(4))}</td>
                            <td className="p-3 text-right border-r border-border bg-purple-50/20 dark:bg-purple-950/10 font-medium">{Number(rengM3.toFixed(4))}</td>
                            {/* Total Muatan */}
                            <td className="p-3 text-right border-r border-border bg-emerald-50/20 dark:bg-emerald-950/10 font-bold">{totPcs}</td>
                            <td className="p-3 text-right bg-emerald-50/20 dark:bg-emerald-950/10 font-bold text-emerald-600 dark:text-emerald-400">{Number(totM3.toFixed(4))}</td>
                            <td className="p-3 text-center border-l border-border">
                              <Badge 
                                variant={s.status === 'CONFIRMED' ? 'default' : s.status === 'CANCELLED' ? 'destructive' : 'secondary'}
                                className={s.status === 'CONFIRMED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                              >
                                {s.status || 'DRAFT'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {shipments.length > 0 && (
                    <tfoot className="bg-muted/60 font-bold border-t-2 border-border">
                      <tr>
                        <td colSpan={2} className="p-3 text-right uppercase tracking-wider border-r border-border">
                          GRAND TOTAL MUATAN
                        </td>
                        <td className="p-3 text-right border-r border-border">
                          {shipments.reduce((sum, s) => sum + (s.items || []).filter((i: any) => !(i.species || "").toUpperCase().includes("BENGKIRAI")).reduce((acc: number, i: any) => acc + (i.quantityPcs || 0), 0), 0)}
                        </td>
                        <td className="p-3 text-right border-r border-border text-amber-700 dark:text-amber-400">
                          {Number(totalM3Meranti.toFixed(4))}
                        </td>
                        <td className="p-3 text-right border-r border-border">
                          {shipments.reduce((sum, s) => sum + (s.items || []).filter((i: any) => (i.species || "").toUpperCase().includes("BENGKIRAI")).reduce((acc: number, i: any) => acc + (i.quantityPcs || 0), 0), 0)}
                        </td>
                        <td className="p-3 text-right border-r border-border text-blue-700 dark:text-blue-400">
                          {Number(totalM3Bengkirai.toFixed(4))}
                        </td>
                        <td className="p-3 text-right border-r border-border text-purple-700 dark:text-purple-400">
                          {Number(totalM3Balok.toFixed(4))}
                        </td>
                        <td className="p-3 text-right border-r border-border text-purple-700 dark:text-purple-400">
                          {Number(totalM3Reng.toFixed(4))}
                        </td>
                        <td className="p-3 text-right border-r border-border text-foreground">
                          {totalPcs}
                        </td>
                        <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                          {Number(totalM3.toFixed(4))}
                        </td>
                        <td className="p-3 text-center border-l border-border">
                          -
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

