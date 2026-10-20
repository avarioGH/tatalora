"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PurchaseAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

export default function CreatePurchaseLogPage({ params }: { params: any }) {
  const router = useRouter();
  const { id } = React.use(params as Promise<{ id: string }>);
  const [purchase, setPurchase] = useState<any>(null);
  const [formData, setFormData] = useState({
    logNumber: "",
    species: "",
    purchaseLength: "",
    purchaseDiameter1: "",
    purchaseDiameter2: "",
    purchaseDiameter3: "",
    purchaseDiameter4: "",
    purchaseVolume: "",
  });

  useEffect(() => {
    if (id) {
      PurchaseAPI.getPurchase(id).then((res: any) => {
        setPurchase(res?.data || res);
      });
    }
  }, [id]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!id) return;
    try {
      await PurchaseAPI.addPurchaseLogItem(id, {
        ...formData,
        purchaseLength: Number(formData.purchaseLength),
        purchaseDiameter1: Number(formData.purchaseDiameter1),
        purchaseDiameter2: Number(formData.purchaseDiameter2),
        purchaseDiameter3: Number(formData.purchaseDiameter3),
        purchaseDiameter4: Number(formData.purchaseDiameter4),
        purchaseVolume: Number(formData.purchaseVolume) || 0,
      });
      router.push(`/inventory/purchase/${id}`);
    } catch (err) {
      alert("Failed to save purchase log");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold text-white">Add Purchase Log</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Context</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-400">
            <p>PO Number: {purchase?.purchaseNumber || purchase?.code || id}</p>
            <p>Supplier: {purchase?.source?.name || purchase?.supplier?.name || "-"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What We Purchased (Supplier Declaration)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Log Number</Label>
                <Input required value={formData.logNumber} onChange={e => setFormData({...formData, logNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Species</Label>
                <Input required value={formData.species} onChange={e => setFormData({...formData, species: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Length (m/cm)</Label>
                <Input required type="number" step="any" value={formData.purchaseLength} onChange={e => setFormData({...formData, purchaseLength: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Volume (m³)</Label>
                <Input required type="number" step="any" value={formData.purchaseVolume} onChange={e => setFormData({...formData, purchaseVolume: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Diameter 1</Label>
                <Input required type="number" step="any" value={formData.purchaseDiameter1} onChange={e => setFormData({...formData, purchaseDiameter1: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Diameter 2</Label>
                <Input required type="number" step="any" value={formData.purchaseDiameter2} onChange={e => setFormData({...formData, purchaseDiameter2: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Diameter 3</Label>
                <Input required type="number" step="any" value={formData.purchaseDiameter3} onChange={e => setFormData({...formData, purchaseDiameter3: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Diameter 4</Label>
                <Input required type="number" step="any" value={formData.purchaseDiameter4} onChange={e => setFormData({...formData, purchaseDiameter4: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit">Save Purchase Log</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

