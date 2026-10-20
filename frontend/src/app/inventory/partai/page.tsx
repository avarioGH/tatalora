"use client";
import React, { useEffect, useState } from "react";
import { PartaiAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, LayoutGrid, List, FolderOpen , Eye, Edit, Trash2} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PartaiListPage() {
  const router = useRouter();
  const [partais, setPartais] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'folder'>('list');  const fetchPartais = async () => {
    try {
      const res = await PartaiAPI.getPartais();
      setPartais(res || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, code: string) => {

    if (!confirm(`Yakin ingin menghapus partai ${code}?`)) return;
    try {
      await PartaiAPI.deletePartai(id);
      fetchPartais();
    } catch (err: any) {
      alert("Gagal menghapus partai: " + (err?.response?.data?.error?.message || err?.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    fetchPartais();
  }, []);

  const filteredPartais = partais.filter(p => 
    (p.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Partai (Project)</h1>
          <p className="text-sm text-muted-foreground">Kelola siklus produksi berdasarkan Partai/Project</p>
        </div>
        <Button onClick={() => router.push('/inventory/partai/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Buat Partai Baru
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari kode atau nama partai..." 
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-8"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" /> List
          </Button>
          <Button 
            variant={viewMode === 'folder' ? 'secondary' : 'ghost'} 
            size="sm"
            className="h-8"
            onClick={() => setViewMode('folder')}
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> Folder
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px]">Kode Partai</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartais.map((p: any) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50 group" onClick={() => router.push(`/inventory/partai/${p.id}`)}>
                    <TableCell className="font-bold flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-500" />
                      {p.code}
                    </TableCell>
                    <TableCell>{p.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(p.startDate).toLocaleDateString()}</TableCell>
                                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Buka Folder" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/partai/${p.id}`) }}>
                            <FolderOpen className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Edit" onClick={(e) => { e.stopPropagation(); router.push(`/inventory/partai/${p.id}/edit`) }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.code) }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                  </TableRow>
                ))}
                {filteredPartais.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Pencarian tidak ditemukan atau belum ada partai.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPartais.map((p: any) => (
            <Card 
              key={p.id} 
              className="cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all duration-200 group bg-card"
              onClick={() => router.push(`/inventory/partai/${p.id}`)}
            >
              <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <FolderOpen className="w-8 h-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground line-clamp-1" title={p.code}>{p.code}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1" title={p.name}>{p.name || "Tanpa Nama"}</p>
                </div>
                <div className="flex items-center justify-between w-full pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">{new Date(p.startDate).toLocaleDateString()}</span>
                  <Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {p.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredPartais.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground bg-card rounded-xl border border-dashed">
              Pencarian tidak ditemukan atau belum ada partai.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
