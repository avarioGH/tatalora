"use client";

import { useEffect, useState } from "react";
import { MasterDataAPI, InventoryAPI, ShipmentAPI, TimberAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, ArrowLeft, Plus, Trash2, Truck, Box, Package2, Save, 
  MapPin, UserSquare2, Layers, AlertTriangle, CheckCircle2, PackageCheck 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TallyItem {
  timberVariantId?: string;
  species: string;
  productCategory: string;
  thicknessCm: number;
  widthCm: number;
  lengthCm: number;
  quantityPcs: number;
  volumeM3: number;
  availablePcs?: number;
  availableM3?: number;
  isManual?: boolean;
}

export default function CreateShipmentPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    shipmentNumber: `FUSO-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(10 + Math.random() * 90)}`,
    fusoName: "FUSO 01",
    policeNumber: "",
    driverName: "",
    shipmentDate: new Date().toISOString().slice(0, 10),
    warehouseId: "",
    destinationName: "",
    destinationAddress: "",
    notes: "",
  });

  const [items, setItems] = useState<TallyItem[]>([
    {
      timberVariantId: "",
      species: "MERANTI",
      productCategory: "BALOK",
      thicknessCm: 15,
      widthCm: 25,
      lengthCm: 400,
      quantityPcs: 10,
      volumeM3: 0.15,
      availablePcs: undefined,
      isManual: false,
    },
  ]);

  // Load Warehouses on mount
  useEffect(() => {
    InventoryAPI.getWarehouses()
      .then((res: any) => {
        const whList = res?.data || res || [];
        setWarehouses(whList);
        if (whList.length > 0 && !form.warehouseId) {
          const firstWh = whList[0].id;
          setForm(f => ({ ...f, warehouseId: firstWh }));
          loadStocksForWarehouse(firstWh);
        }
      })
      .catch((err: any) => console.error("Gagal load gudang:", err));
  }, []);

  // Load stocks whenever warehouse changes
  const loadStocksForWarehouse = async (whId: string) => {
    if (!whId) return;
    setLoadingStocks(true);
    try {
      const res = await TimberAPI.getTimberStock({ locationId: whId, take: 500 });
      const rawItems = res?.items || res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
      // Normalize items
      const normalized = rawItems.map((s: any) => {
        const v = s.timberVariant || s.variant || {};
        return {
          id: s.id,
          locationId: s.locationId || s.warehouseId,
          timberVariantId: s.timberVariantId || s.variantId || v.id,
          currentPcs: s.currentPcs !== undefined ? s.currentPcs : s.quantityPCS || 0,
          currentVolumeM3: s.currentVolumeM3 !== undefined ? s.currentVolumeM3 : s.volumeM3 || 0,
          variant: {
            id: v.id || s.timberVariantId,
            sku: v.sku || "VAR",
            species: v.species || "MERANTI",
            grade: v.grade || "STANDARD",
            thickness: v.thickness || v.thicknessMm || 0,
            width: v.width || v.widthMm || 0,
            length: v.length || v.lengthMm || 0,
          }
        };
      }).filter((s: any) => s.currentPcs > 0);

      setStocks(normalized);
    } catch (e) {
      console.error("Gagal load data stok gudang:", e);
    } finally {
      setLoadingStocks(false);
    }
  };

  const handleWarehouseChange = (whId: string) => {
    setForm(f => ({ ...f, warehouseId: whId }));
    loadStocksForWarehouse(whId);
  };

  const calculateVolume = (t: number, l: number, p: number, qty: number) => {
    if (!t || !l || !p || !qty) return 0;
    // T, L, P in cm -> vol in m3 = (T * L * P) / 1,000,000 * qty
    return Number(((t * l * p * qty) / 1000000).toFixed(4));
  };

  const handleItemChange = (index: number, field: keyof TallyItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;

    if (field === 'thicknessCm' || field === 'widthCm' || field === 'lengthCm' || field === 'quantityPcs') {
      const t = Number(updated[index].thicknessCm) || 0;
      const l = Number(updated[index].widthCm) || 0;
      const p = Number(updated[index].lengthCm) || 0;
      const q = Number(updated[index].quantityPcs) || 0;
      updated[index].volumeM3 = calculateVolume(t, l, p, q);
    }

    setItems(updated);
  };

  const handleSelectStockVariant = (index: number, variantId: string) => {
    const updated = [...items];

    if (variantId === "MANUAL") {
      updated[index].timberVariantId = "";
      updated[index].isManual = true;
      updated[index].availablePcs = undefined;
      updated[index].availableM3 = undefined;
      setItems(updated);
      return;
    }

    const selectedStock = stocks.find(s => s.timberVariantId === variantId);
    if (selectedStock && selectedStock.variant) {
      const v = selectedStock.variant;
      const tCm = (v.thickness || 0) / 10;
      const lCm = (v.width || 0) / 10;
      const pCm = (v.length || 0) / 10;

      // Auto detect Balok vs Reng
      const autoCat = (tCm >= 10 || lCm >= 15) ? "BALOK" : "RENG";
      const currentQty = updated[index].quantityPcs || 1;

      updated[index].timberVariantId = variantId;
      updated[index].isManual = false;
      updated[index].species = v.species || "MERANTI";
      updated[index].productCategory = autoCat;
      updated[index].thicknessCm = tCm;
      updated[index].widthCm = lCm;
      updated[index].lengthCm = pCm;
      updated[index].availablePcs = selectedStock.currentPcs;
      updated[index].availableM3 = selectedStock.currentVolumeM3;
      updated[index].volumeM3 = calculateVolume(tCm, lCm, pCm, currentQty);
    }

    setItems(updated);
  };

  const addItemRow = () => {
    // If stocks are available, default to first available stock item
    const firstStock = stocks[0];
    if (firstStock && firstStock.variant) {
      const v = firstStock.variant;
      const tCm = (v.thickness || 0) / 10;
      const lCm = (v.width || 0) / 10;
      const pCm = (v.length || 0) / 10;
      setItems([
        ...items,
        {
          timberVariantId: firstStock.timberVariantId,
          species: v.species || "MERANTI",
          productCategory: (tCm >= 10 || lCm >= 15) ? "BALOK" : "RENG",
          thicknessCm: tCm,
          widthCm: lCm,
          lengthCm: pCm,
          quantityPcs: 1,
          volumeM3: calculateVolume(tCm, lCm, pCm, 1),
          availablePcs: firstStock.currentPcs,
          availableM3: firstStock.currentVolumeM3,
          isManual: false,
        },
      ]);
    } else {
      setItems([
        ...items,
        {
          timberVariantId: "",
          species: "MERANTI",
          productCategory: "BALOK",
          thicknessCm: 10,
          widthCm: 20,
          lengthCm: 400,
          quantityPcs: 10,
          volumeM3: 0.8,
          availablePcs: undefined,
          isManual: true,
        },
      ]);
    }
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totalPcs = items.reduce((sum, i) => sum + (Number(i.quantityPcs) || 0), 0);
  const totalM3 = items.reduce((sum, i) => sum + (Number(i.volumeM3) || 0), 0);

  // Check if any row exceeds warehouse stock
  const hasOverStock = items.some(i => i.availablePcs !== undefined && i.quantityPcs > i.availablePcs);

  const handleSubmit = async (e: React.FormEvent, autoConfirm: boolean = false) => {
    e.preventDefault();
    setError("");

    if (!form.warehouseId) {
      setError("Pilih gudang asal muat terlebih dahulu");
      return;
    }
    if (items.length === 0 || totalPcs <= 0) {
      setError("Tambahkan minimal satu baris muatan dengan jumlah > 0");
      return;
    }

    if (autoConfirm && hasOverStock) {
      if (!confirm("Beberapa item melebihi stok fisik gudang yang tercatat. Lanjutkan tetap potong stok?")) {
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        shipmentNumber: form.shipmentNumber,
        fusoName: form.fusoName || form.shipmentNumber,
        policeNumber: form.policeNumber,
        driverName: form.driverName,
        shipmentDate: form.shipmentDate ? new Date(form.shipmentDate).toISOString() : new Date().toISOString(),
        warehouseId: form.warehouseId,
        destinationName: form.destinationName,
        destinationAddress: form.destinationAddress,
        notes: form.notes,
        autoConfirm: autoConfirm,
        items: items.map(i => ({
          timberVariantId: i.timberVariantId || undefined,
          species: i.species,
          productCategory: i.productCategory,
          thicknessMm: (Number(i.thicknessCm) || 0) * 10,
          widthMm: (Number(i.widthCm) || 0) * 10,
          lengthMm: (Number(i.lengthCm) || 0) * 10,
          quantityPcs: Number(i.quantityPcs) || 0,
          volumeM3: Number(i.volumeM3) || 0,
        })),
      };

      const res = await ShipmentAPI.createShipment(payload);
      if (autoConfirm) {
        alert("Surat muat berhasil disimpan dan stok gudang otomatis dipotong!");
      }
      router.push(`/inventory/shipment/${res.id || ""}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Gagal menyimpan surat muat fuso");
    } finally {
      setLoading(false);
    }
  };

  const selectedWarehouse = warehouses.find(w => w.id === form.warehouseId);

  return (
    <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in duration-500 pb-20 px-4 md:px-6 box-border">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 md:p-6 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0 h-10 w-10">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                <Truck className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Buat Surat Tally Muatan Fuso
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pilih kayu dari stok gudang, catat armada pengangkut, dan kurangi stok otomatis saat diberangkatkan.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200 border-red-200 dark:border-red-900/50 rounded-xl">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription className="font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Armada & Destinasi Form */}
        <Card className="bg-card rounded-xl border border-border shadow-sm">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" /> Informasi Armada & Tujuan Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">No. Surat Muat</Label>
                <Input 
                  value={form.shipmentNumber} 
                  onChange={e => setForm({ ...form, shipmentNumber: e.target.value })} 
                  placeholder="e.g. SJM-2026-001" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Nama Fuso / Truk</Label>
                <Input 
                  value={form.fusoName} 
                  onChange={e => setForm({ ...form, fusoName: e.target.value })} 
                  placeholder="e.g. FUSO 01 / TRUK 1" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">No. Polisi Kendaraan</Label>
                <Input 
                  value={form.policeNumber} 
                  onChange={e => setForm({ ...form, policeNumber: e.target.value })} 
                  placeholder="e.g. L 8355 NA / KH 8916 GO" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Nama Supir</Label>
                <Input 
                  value={form.driverName} 
                  onChange={e => setForm({ ...form, driverName: e.target.value })} 
                  placeholder="e.g. Teguh / Rahman" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Tanggal Muat</Label>
                <Input 
                  type="date" 
                  value={form.shipmentDate} 
                  onChange={e => setForm({ ...form, shipmentDate: e.target.value })} 
                  required 
                />
              </div>

              {/* Warehouse selector showing clean names */}
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground flex items-center justify-between">
                  <span>Gudang Asal Muat (Sumber Stok)</span>
                  {loadingStocks && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                </Label>
                <Select value={form.warehouseId} onValueChange={(v: string | null) => handleWarehouseChange(v || "")}>
                  <SelectTrigger className="font-semibold">
                    <SelectValue placeholder="Pilih gudang...">
                      {selectedWarehouse ? (selectedWarehouse.name || selectedWarehouse.code || selectedWarehouse.id) : "Pilih gudang..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id} className="font-medium">
                        {w.name || w.code || w.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {stocks.length > 0 && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {stocks.length} varian kayu tersedia di gudang ini
                  </p>
                )}
                {stocks.length === 0 && !loadingStocks && form.warehouseId && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    ⚠️ Belum ada stok kayu jadi terdaftar di gudang ini.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Tujuan / Nama Pembeli</Label>
                <Input 
                  value={form.destinationName} 
                  onChange={e => setForm({ ...form, destinationName: e.target.value })} 
                  placeholder="e.g. Pak Heri (Surabaya)" 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Catatan / Keterangan</Label>
                <Input 
                  value={form.notes} 
                  onChange={e => setForm({ ...form, notes: e.target.value })} 
                  placeholder="e.g. Muatan ex Sampit / Kalteng" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tally Muat Table Connected to Stock */}
        <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <CardHeader className="p-4 md:p-5 border-b border-border/50 bg-muted/10 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" /> Rincian Tally Muatan (Terhubung ke Stok Gudang)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Pilih ukuran dari stok kayu yang tersedia di gudang asal. Volume M³ dan sisa stok akan dihitung otomatis.
              </CardDescription>
            </div>
            <Button type="button" onClick={addItemRow} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              <Plus className="w-4 h-4 mr-1.5" /> Tambah Baris
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto w-full">
              <table className="min-w-[1000px] w-full text-xs sm:text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="p-3 text-center w-12 font-semibold">No</th>
                    <th className="p-3 text-left w-72 font-semibold">Ambil dari Stok Gudang</th>
                    <th className="p-3 text-left w-32 font-semibold">Kategori</th>
                    <th className="p-3 text-center w-36 font-semibold">Dimensi (T × L × P cm)</th>
                    <th className="p-3 text-right w-24 font-semibold">Stok Ada</th>
                    <th className="p-3 text-right w-28 font-semibold">Pcs Dimuat</th>
                    <th className="p-3 text-right w-28 font-semibold">Volume (M³)</th>
                    <th className="p-3 text-center w-16 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isOver = item.availablePcs !== undefined && item.quantityPcs > item.availablePcs;
                    const remainingStock = item.availablePcs !== undefined ? item.availablePcs - item.quantityPcs : null;

                    return (
                      <tr key={idx} className={`border-b border-border/50 hover:bg-muted/20 ${isOver ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}>
                        <td className="p-3 text-center text-muted-foreground font-semibold">
                          {idx + 1}
                        </td>

                        {/* Stok Selection Dropdown */}
                        <td className="p-3">
                          <Select 
                            value={item.isManual ? "MANUAL" : (item.timberVariantId || "MANUAL")} 
                            onValueChange={(val: string | null) => handleSelectStockVariant(idx, val || "MANUAL")}
                          >
                            <SelectTrigger className="h-9 font-medium text-xs">
                              <SelectValue placeholder="Pilih stok gudang..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {stocks.length > 0 && (
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 rounded mb-1">
                                  STOK TERSEDIA DI GUDANG INI
                                </div>
                              )}
                              {stocks.map(s => {
                                const v = s.variant;
                                const t = (v.thickness || 0) / 10;
                                const l = (v.width || 0) / 10;
                                const p = (v.length || 0) / 10;
                                return (
                                  <SelectItem key={s.timberVariantId} value={s.timberVariantId} className="text-xs">
                                    <span className="font-bold text-foreground">{v.species}</span> ({v.grade}) - {t}×{l}×{p} cm • <span className="font-bold text-emerald-600">Stok: {s.currentPcs} pcs</span> ({Number(s.currentVolumeM3.toFixed(3))} m³)
                                  </SelectItem>
                                );
                              })}
                              <div className="border-t my-1"></div>
                              <SelectItem value="MANUAL" className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                                ✎ Input Ukuran Manual (Non-Stok)
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Detail / Status Stok */}
                          <div className="mt-1 flex items-center gap-2">
                            {item.availablePcs !== undefined ? (
                              <span className={`text-[11px] font-medium ${isOver ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>
                                Tersedia: <strong>{item.availablePcs} pcs</strong>
                                {remainingStock !== null && (
                                  <span className="text-muted-foreground ml-1">
                                    (Sisa: {remainingStock} pcs)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                Input ukuran manual bebas
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="p-3">
                          <Select 
                            value={item.productCategory} 
                            onValueChange={(v: string | null) => handleItemChange(idx, 'productCategory', v || 'BALOK')}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BALOK">Balok / Main Size</SelectItem>
                              <SelectItem value="RENG">Reng / Papan</SelectItem>
                              <SelectItem value="AFKIR_BS">BS / Afkir</SelectItem>
                              <SelectItem value="AIR_DRY">Air Dry (AD)</SelectItem>
                              <SelectItem value="FJL">FJL</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Dimensi T x L x P */}
                        <td className="p-3">
                          {item.isManual ? (
                            <div className="flex items-center gap-1">
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0.1" 
                                placeholder="T"
                                value={item.thicknessCm} 
                                onChange={e => handleItemChange(idx, 'thicknessCm', parseFloat(e.target.value) || 0)}
                                className="h-9 w-12 text-center text-xs font-mono p-1" 
                                title="Tebal cm"
                              />
                              <span className="text-muted-foreground">×</span>
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0.1" 
                                placeholder="L"
                                value={item.widthCm} 
                                onChange={e => handleItemChange(idx, 'widthCm', parseFloat(e.target.value) || 0)}
                                className="h-9 w-12 text-center text-xs font-mono p-1" 
                                title="Lebar cm"
                              />
                              <span className="text-muted-foreground">×</span>
                              <Input 
                                type="number" 
                                step="1" 
                                min="1" 
                                placeholder="P"
                                value={item.lengthCm} 
                                onChange={e => handleItemChange(idx, 'lengthCm', parseFloat(e.target.value) || 0)}
                                className="h-9 w-14 text-center text-xs font-mono p-1" 
                                title="Panjang cm"
                              />
                            </div>
                          ) : (
                            <div className="text-center font-mono font-semibold text-xs py-1.5 px-2 bg-muted/40 rounded border border-border/50">
                              {item.thicknessCm} × {item.widthCm} × {item.lengthCm} cm
                            </div>
                          )}
                        </td>

                        {/* Stok Ada */}
                        <td className="p-3 text-right font-medium text-muted-foreground">
                          {item.availablePcs !== undefined ? `${item.availablePcs} pcs` : "-"}
                        </td>

                        {/* Pcs Dimuat */}
                        <td className="p-3">
                          <Input 
                            type="number" 
                            min="1" 
                            value={item.quantityPcs} 
                            onChange={e => handleItemChange(idx, 'quantityPcs', parseInt(e.target.value) || 0)}
                            className={`h-9 text-right font-bold ${isOver ? 'border-red-500 text-red-600 bg-red-50/30' : ''}`} 
                          />
                          {isOver && (
                            <p className="text-[10px] text-red-600 font-bold mt-1 text-right">
                              ⚠️ Melebihi stok!
                            </p>
                          )}
                        </td>

                        {/* Volume M3 */}
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(item.volumeM3.toFixed(4))}
                        </td>

                        {/* Aksi Hapus */}
                        <td className="p-3 text-center">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            disabled={items.length <= 1}
                            onClick={() => removeItemRow(idx)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/40 font-bold border-t-2 border-border">
                  <tr>
                    <td colSpan={5} className="p-3 text-right uppercase tracking-wider">
                      TOTAL MUATAN FUSO:
                    </td>
                    <td className="p-3 text-right font-bold text-foreground text-sm">
                      {totalPcs.toLocaleString("id-ID")} pcs
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-base">
                      {Number(totalM3.toFixed(4))} m³
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Capacity Indicator & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <Truck className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                Estimasi Muatan: {Number(totalM3.toFixed(3))} M³ ({totalPcs} Pcs)
              </p>
              <p className="text-xs text-muted-foreground">
                Kapasitas standar Fuso: ~30 - 35 M³. {totalM3 > 35 ? <span className="text-amber-600 font-bold">⚠️ Perhatian: Muatan melebihi 35 M³</span> : "Muatan dalam batas aman."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()} 
              className="font-semibold"
            >
              Batal
            </Button>

            {/* Simpan Draft (Belum potong stok) */}
            <Button 
              type="submit" 
              disabled={loading} 
              variant="secondary"
              className="font-semibold border shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Simpan Draft (Belum Potong Stok)
            </Button>

            {/* Simpan & Potong Stok Sekarang */}
            <Button 
              type="button" 
              disabled={loading} 
              onClick={(e) => handleSubmit(e, true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Simpan & Potong Stok Sekarang
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
