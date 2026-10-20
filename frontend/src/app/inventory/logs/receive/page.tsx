"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PurchaseAPI, InventoryAPI, MasterDataAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ReceivePurchaseLogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get('purchaseId');
  const itemId = searchParams.get('itemId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [purchase, setPurchase] = useState<any>(null);
  const [logItem, setLogItem] = useState<any>(null);
  
  const [warehouses, setWarehouses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    length: "",
    d1: "", d2: "", d3: "", d4: "",
    gerowong: "",
    locationId: "",
  });

  useEffect(() => {
    if (!purchaseId || !itemId) return;
    Promise.all([
      PurchaseAPI.getPurchase(purchaseId),
      InventoryAPI.getWarehouses()
    ]).then(([pRes, wRes]: any) => {
      const p = pRes?.data || pRes;
      setPurchase(p);
      const li = (p.logItems || []).find((x: any) => x.id === itemId);
      setLogItem(li);
      setWarehouses(Array.isArray(wRes) ? wRes : []);
      
      // Auto fill location if purchase has a warehouse
      if (p.warehouseId) {
        setFormData(f => ({ ...f, locationId: p.warehouseId }));
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [purchaseId, itemId]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!logItem) return <div className="p-6 text-red-500">Purchase Log Item not found.</div>;
  if (logItem.status === 'RECEIVED') return <div className="p-6 text-red-500 font-bold">Already Received!</div>;

  const varianceLength = formData.length ? (Number(formData.length) - Number(logItem.purchaseLength)).toFixed(2) : null;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const payload = {
        logNumber: logItem.logNumber,
        species: logItem.species,
        speciesId: logItem.speciesId,
        originalLength: Number(formData.length),
        diameter1: Number(formData.d1),
        diameter2: Number(formData.d2),
        diameter3: Number(formData.d3),
        diameter4: Number(formData.d4),
        gerowong: formData.gerowong ? Number(formData.gerowong) : 0,
        locationId: formData.locationId,
        purchaseLogItemId: logItem.id,
      };
      await InventoryAPI.createRawLog(payload);
      router.push(`/inventory/purchase/${purchaseId}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to receive log");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Receive Log: {logItem.logNumber}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PURCHASE MEASUREMENT (READ ONLY) */}
        <Card className="bg-muted/10 border-muted">
          <CardHeader>
            <CardTitle className="text-lg">What We Purchased</CardTitle>
            <CardDescription>Supplier Declaration (Read Only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">Purchase Ref:</span>
              <p className="font-semibold">{purchase.purchaseNumber}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Log Number:</span>
              <p className="font-semibold text-lg">{logItem.logNumber}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Species:</span>
              <p>{logItem.species}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-background p-3 rounded-lg border">
                <span className="text-xs text-gray-500 block">Length</span>
                <span className="font-bold text-lg">{logItem.purchaseLength} m</span>
              </div>
              <div className="bg-background p-3 rounded-lg border">
                <span className="text-xs text-gray-500 block">Volume</span>
                <span className="font-bold text-lg">{logItem.purchaseVolume} m³</span>
              </div>
            </div>
            <div className="bg-background p-3 rounded-lg border">
              <span className="text-xs text-gray-500 block mb-1">Diameters (cm)</span>
              <div className="flex justify-between font-medium">
                <span>D1: {logItem.purchaseDiameter1}</span>
                <span>D2: {logItem.purchaseDiameter2}</span>
                <span>D3: {logItem.purchaseDiameter3}</span>
                <span>D4: {logItem.purchaseDiameter4}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACTUAL RECEIVING MEASUREMENT */}
        <Card className="border-primary/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Actual Receiving</CardTitle>
            <CardDescription>Enter actual physical measurements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Warehouse / Location</label>
              <Select value={formData.locationId} onValueChange={v => setFormData({...formData, locationId: v || ""})}>
                <SelectTrigger>
                  {formData.locationId ? warehouses.find(w => w.id === formData.locationId)?.name : <SelectValue placeholder="Select Warehouse" />}
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Actual Length (m)</label>
                {varianceLength && (
                  <Badge variant={Number(varianceLength) < 0 ? "destructive" : "secondary"}>
                    Var: {Number(varianceLength) > 0 ? "+" : ""}{varianceLength}m
                  </Badge>
                )}
              </div>
              <Input type="number" step="any" value={formData.length} onChange={e => setFormData({...formData, length: e.target.value})} placeholder="e.g. 3.95" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Diameter 1 (cm)</label>
                <Input type="number" step="any" value={formData.d1} onChange={e => setFormData({...formData, d1: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Diameter 2 (cm)</label>
                <Input type="number" step="any" value={formData.d2} onChange={e => setFormData({...formData, d2: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Diameter 3 (cm)</label>
                <Input type="number" step="any" value={formData.d3} onChange={e => setFormData({...formData, d3: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Diameter 4 (cm)</label>
                <Input type="number" step="any" value={formData.d4} onChange={e => setFormData({...formData, d4: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Gerowong (cm) - Optional</label>
              <Input type="number" step="any" value={formData.gerowong} onChange={e => setFormData({...formData, gerowong: e.target.value})} />
            </div>
            
            <Button className="w-full mt-6" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Receive as Inventory
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


