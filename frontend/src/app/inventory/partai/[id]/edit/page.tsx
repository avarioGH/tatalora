"use client";
import React, { useState, useEffect, use } from "react";
import { PartaiAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";

export default function EditPartaiPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [form, setForm] = useState({
    code: "",
    name: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    PartaiAPI.getPartai(id).then((res: any) => {
      if (res) {
        setForm({
          code: res.code || "",
          name: res.name || "",
          notes: res.notes || ""
        });
      }
    }).catch((err: any) => {
      alert("Gagal memuat data partai");
    }).finally(() => {
      setFetching(false);
    });
  }, [id]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await PartaiAPI.updatePartai(id, form);
      alert("Partai berhasil diperbarui");
      router.push('/inventory/partai');
    } catch (err: any) {
      alert("Gagal memperbarui: " + (err?.response?.data?.error?.message || err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-center text-muted-foreground">Memuat...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Partai</h1>
          <p className="text-sm text-gray-400">Edit informasi {form.code}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Partai</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kode Partai <span className="text-red-500">*</span></Label>
              <Input 
                required 
                placeholder="Contoh: A/01/L02/GLI/ULIN" 
                value={form.code} 
                onChange={e => setForm({...form, code: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Nama / Keterangan</Label>
              <Input 
                placeholder="Contoh: Produksi Ulin Bulan Ini" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input 
                placeholder="Catatan tambahan..." 
                value={form.notes} 
                onChange={e => setForm({...form, notes: e.target.value})} 
              />
            </div>
            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
