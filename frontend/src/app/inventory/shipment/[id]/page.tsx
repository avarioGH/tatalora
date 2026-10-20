"use client";

import { useEffect, useState } from "react";
import { ShipmentAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, ArrowLeft, Loader2, CheckCircle2, XCircle, Truck, 
  MapPin, UserSquare2, Package2, CalendarClock, Printer, Trash2, 
  Layers, BarChart2, ShieldCheck 
} from "lucide-react";

export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [shipment, setShipment] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = () => {
    setLoading(true);
    ShipmentAPI.getShipment(params.id)
      .then((res: any) => {
        setShipment(res?.data || res);
        setLoading(false);
      })
      .catch((err: any) => {
        setError("Gagal memuat data muatan fuso");
        setLoading(false);
      });
  };

  const handleConfirm = async () => {
    if (!confirm("Konfirmasi keberangkatan armada ini? Stok kayu jadi di gudang akan otomatis dipotong.")) return;
    setError("");
    setActionLoading(true);
    try {
      await ShipmentAPI.confirmShipment(params.id);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Konfirmasi pengiriman gagal");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Batalkan pengiriman armada ini? Stok kayu yang sebelumnya dipotong akan otomatis dikembalikan ke gudang.")) return;
    setError("");
    setActionLoading(true);
    try {
      await ShipmentAPI.cancelShipment(params.id);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Pembatalan gagal");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Hapus draft surat muat ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setError("");
    setActionLoading(true);
    try {
      await ShipmentAPI.deleteShipment(params.id);
      router.push("/inventory/shipment");
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Gagal menghapus surat muat");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 md:p-24 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shipment && error) {
    return (
      <div className="p-8 md:p-24 flex flex-col items-center justify-center text-center animate-in fade-in">
        <Truck className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Data Muatan Tidak Ditemukan</h2>
        <p className="text-muted-foreground max-w-md mb-6 text-[15px]">Data pengiriman tidak ditemukan atau terjadi kesalahan server.</p>
        <Button onClick={() => router.push('/inventory/shipment')} variant="outline" className="h-10 px-6 font-semibold">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Data Muat
        </Button>
      </div>
    );
  }

  if (!shipment) return null;

  const fusoTitle = shipment.fusoName || shipment.shipmentNumber || shipment.code || "Muatan Fuso";
  const sNum = shipment.shipmentNumber || shipment.code || "-";
  const plate = shipment.policeNumber || shipment.vehicle?.licensePlate || shipment.vehicle?.name || "-";
  const driver = shipment.driverName || shipment.driver?.name || "-";
  const isDraft = shipment.status === 'DRAFT' || !shipment.status;
  const isConfirmed = shipment.status === 'CONFIRMED';

  const totalPcs = shipment.totalPcs || (shipment.items || []).reduce((sum: number, i: any) => sum + (i.quantityPcs || 0), 0);
  const totalM3 = shipment.totalVolumeM3 || (shipment.items || []).reduce((sum: number, i: any) => sum + (i.volumeM3 || 0), 0);

  // Group items by category & species
  let balokM3 = 0;
  let rengM3 = 0;
  let mrtM3 = 0;
  let bkrM3 = 0;

  (shipment.items || []).forEach((item: any) => {
    const vol = item.volumeM3 || 0;
    const cat = (item.productCategory || "BALOK").toUpperCase();
    const spec = (item.species || item.timberVariant?.species || "").toUpperCase();

    if (cat.includes("BALOK") || cat === "MAIN") balokM3 += vol;
    else if (cat.includes("RENG") || cat.includes("PAPAN") || cat === "LOKAL") rengM3 += vol;

    if (spec.includes("BENGKIRAI") || spec.includes("BKR")) bkrM3 += vol;
    else mrtM3 += vol;
  });

  return (
    <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-16 px-4 md:px-6 box-border">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/inventory/shipment')} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Truck className="w-6 h-6 text-amber-600" /> {fusoTitle}
              </h1>
              <Badge 
                variant={isConfirmed ? 'default' : shipment.status === 'CANCELLED' ? 'destructive' : 'secondary'} 
                className={`text-[11px] font-bold tracking-wider uppercase ${isConfirmed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              >
                {shipment.status || 'DRAFT'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
              <span className="font-medium text-foreground/80">No: {sNum}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> 
                {shipment.shipmentDate ? new Date(shipment.shipmentDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString('id-ID') : '-'}
              </span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.open(`/inventory/shipment/${params.id}/print`, "_blank")} 
            className="w-full sm:w-auto shadow-sm font-semibold h-10"
          >
            <Printer className="w-4 h-4 mr-2 text-slate-600" /> Cetak Surat Tally Muat
          </Button>

          {isDraft && (
            <>
              <Button 
                onClick={handleConfirm} 
                disabled={actionLoading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} 
                Konfirmasi Berangkat
              </Button>
              <Button 
                onClick={handleDelete} 
                disabled={actionLoading}
                variant="destructive" 
                className="w-full sm:w-auto font-semibold h-10"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Hapus Draft
              </Button>
            </>
          )}

          {isConfirmed && (
            <Button 
              onClick={handleCancel} 
              disabled={actionLoading}
              variant="outline" 
              className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 font-semibold h-10"
            >
              <XCircle className="w-4 h-4 mr-2" /> Batalkan Muatan
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200 border-red-200 dark:border-red-900/50 rounded-xl">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Muatan (Pcs)</p>
            <p className="text-2xl font-bold text-foreground">{totalPcs.toLocaleString("id-ID")} pcs</p>
            <p className="text-xs text-muted-foreground mt-0.5">Batang kayu terangkut</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Muatan (M³)</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Number(totalM3.toFixed(4))} m³</p>
            <p className="text-xs text-muted-foreground mt-0.5">Kapasitas muatan armada</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Meranti vs Bengkirai</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
              {Number(mrtM3.toFixed(2))} / {Number(bkrM3.toFixed(2))} m³
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Meranti / Bengkirai</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Balok vs Reng (M³)</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {Number(balokM3.toFixed(2))} / {Number(rengM3.toFixed(2))} m³
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Main Balok / Reng Papan</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Armada & Logistik Info */}
        <Card className="bg-card rounded-xl border border-border shadow-sm lg:col-span-1">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" /> Informasi Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-5 flex flex-col gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Nama Armada / Truk
              </p>
              <p className="font-bold text-foreground text-base">{fusoTitle}</p>
            </div>
            <div className="h-px w-full bg-border/50"></div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">No. Polisi</p>
              <p className="font-semibold text-foreground/90">{plate}</p>
            </div>
            <div className="h-px w-full bg-border/50"></div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                <UserSquare2 className="w-3.5 h-3.5" /> Supir
              </p>
              <p className="font-semibold text-foreground/90">{driver}</p>
            </div>
            <div className="h-px w-full bg-border/50"></div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Gudang Asal
              </p>
              <p className="font-semibold text-foreground/90">{shipment.warehouse?.name || shipment.warehouseId || "-"}</p>
            </div>
            <div className="h-px w-full bg-border/50"></div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tujuan / Pembeli</p>
              <p className="font-semibold text-foreground/90">{shipment.destinationName || shipment.customer?.name || "-"}</p>
              {shipment.destinationAddress && <p className="text-xs text-muted-foreground mt-0.5">{shipment.destinationAddress}</p>}
            </div>

            {shipment.notes && (
              <>
                <div className="h-px w-full bg-border/50"></div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Catatan</p>
                  <p className="text-sm text-foreground/80">{shipment.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tally Items Table */}
        <Card className="bg-card rounded-xl border border-border shadow-sm lg:col-span-2">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Package2 className="w-4 h-4 text-amber-600" /> Rincian Tally Muatan (Ukuran Kayu)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Daftar ukuran balok/reng yang dimuat di armada ini sesuai catatan mandor muat
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <table className="min-w-[650px] w-full text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="p-3 px-4 text-center w-12 font-semibold text-muted-foreground">No</th>
                    <th className="p-3 px-4 text-left font-semibold text-muted-foreground">Jenis / Kategori</th>
                    <th className="p-3 px-4 text-center font-semibold text-muted-foreground">Ukuran (T × L × P)</th>
                    <th className="p-3 px-4 text-right font-semibold text-muted-foreground">Pcs</th>
                    <th className="p-3 px-4 text-right font-semibold text-muted-foreground">Volume M³</th>
                  </tr>
                </thead>
                <tbody>
                  {(shipment.items || []).map((item: any, i: number) => {
                    const t = item.thicknessMm ? item.thicknessMm / 10 : (item.timberVariant?.thickness || 0) / 10;
                    const l = item.widthMm ? item.widthMm / 10 : (item.timberVariant?.width || 0) / 10;
                    const p = item.lengthMm ? item.lengthMm / 10 : (item.timberVariant?.length || 0) / 10;
                    const species = item.species || item.timberVariant?.species || "MERANTI";
                    const cat = item.productCategory || "BALOK";
                    const pcs = item.quantityPcs || item.quantity || 0;
                    const m3 = item.volumeM3 || 0;

                    return (
                      <tr key={item.id || i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 text-center text-muted-foreground font-medium">{i + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-foreground/90">{species}</div>
                          <Badge variant="outline" className={`text-[10px] py-0 mt-0.5 ${cat === 'RENG' ? 'border-amber-500 text-amber-600' : 'border-emerald-500 text-emerald-600'}`}>
                            {cat === 'RENG' ? 'Reng / Papan' : cat === 'AFKIR_BS' ? 'BS / Afkir' : 'Balok / Main'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-center font-medium font-mono text-xs">
                          {t > 0 && l > 0 && p > 0 ? `${t} × ${l} × ${p} cm` : "-"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-foreground">
                          {pcs.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(m3.toFixed(4))}
                        </td>
                      </tr>
                    );
                  })}
                  {(!shipment.items || shipment.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                        Tidak ada rincian item muatan.
                      </td>
                    </tr>
                  )}
                </tbody>
                {shipment.items && shipment.items.length > 0 && (
                  <tfoot className="bg-muted/40 font-bold border-t-2 border-border">
                    <tr>
                      <td colSpan={3} className="p-3 px-4 text-right uppercase tracking-wider">TOTAL MUATAN:</td>
                      <td className="p-3 px-4 text-right text-foreground">{totalPcs.toLocaleString("id-ID")} pcs</td>
                      <td className="p-3 px-4 text-right text-emerald-600 dark:text-emerald-400">{Number(totalM3.toFixed(4))} m³</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
