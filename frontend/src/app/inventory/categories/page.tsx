"use client"

import { useState, useEffect } from"react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { Plus, Edit, Trash2 } from"lucide-react"
import { api } from"@/lib/api"
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from"@/components/ui/dialog"

export default function InventoryCategories() {
 const [categories, setCategories] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [modalOpen, setModalOpen] = useState(false)
 const [isEditing, setIsEditing] = useState(false)
 const [currentId, setCurrentId] = useState<string | null>(null)
 
 const [formData, setFormData] = useState({ 
 name:"", 
 description:"" 
 })

 useEffect(() => {
 fetchData()
 }, [])

 const fetchData = async () => {
 try {
 setLoading(true)
 const res = await api.get('/inventory/categories')
 setCategories(res.data)
 } catch (e) {
 console.error(e)
 } finally {
 setLoading(false)
 }
 }

 const openAddModal = () => {
 setIsEditing(false)
 setCurrentId(null)
 setFormData({ name:"", description:"" })
 setModalOpen(true)
 }

 const openEditModal = (cat: any) => {
 setIsEditing(true)
 setCurrentId(cat.id)
 setFormData({ name: cat.name, description: cat.description ||"" })
 setModalOpen(true)
 }

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault()
 try {
 if (isEditing && currentId) {
 await api.put(`/inventory/categories/${currentId}`, formData)
 } else {
 await api.post('/inventory/categories', formData)
 }
 setModalOpen(false)
 fetchData()
 } catch (e) {
 console.error(e)
 alert("Gagal menyimpan kategori. Pastikan nama tidak duplikat.")
 }
 }

 const handleDelete = async (id: string) => {
 if (!confirm("Yakin ingin menghapus kategori ini?")) return
 try {
 await api.delete(`/inventory/categories/${id}`)
 fetchData()
 } catch (e: any) {
 console.error(e)
 alert(e.response?.data?.message ||"Gagal menghapus kategori. Mungkin sedang digunakan oleh produk.")
 }
 }

 return (
 <div className="space-y-6 animate-in fade-in duration-500">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Kategori Produk</h1>
 <p className="text-muted-foreground">Kelola kategori untuk mengklasifikasikan barang Anda.</p>
 </div>
 <Button onClick={openAddModal}>
 <Plus className="mr-2 h-4 w-4" />
 Kategori Baru
 </Button>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Daftar Kategori</CardTitle>
 <CardDescription>Semua kategori produk yang terdaftar dalam sistem.</CardDescription>
 </CardHeader>
 <CardContent>
 {loading ? (
 <p className="text-sm text-muted-foreground text-center py-4">Memuat data...</p>
 ) : categories.length === 0 ? (
 <p className="text-sm text-muted-foreground text-center py-4">Belum ada kategori yang ditambahkan.</p>
 ) : (
 <div className="border rounded-md overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm">
 <thead>
 <tr className="border-b bg-muted/50">
 <th className="p-3 text-left font-medium">Nama Kategori</th>
 <th className="p-3 text-left font-medium">Deskripsi</th>
 <th className="p-3 text-right font-medium">Aksi</th>
 </tr>
 </thead>
 <tbody>
 {categories.map((c) => (
 <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
 <td className="p-3 font-medium">{c.name}</td>
 <td className="p-3 text-muted-foreground">{c.description || '-'}</td>
 <td className="p-3 text-right">
 <div className="flex items-center justify-end gap-2">
 <Button variant="ghost" size="icon" onClick={() => openEditModal(c)}>
 <Edit className="w-4 h-4 text-muted-foreground" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
 <Trash2 className="w-4 h-4 text-red-500" />
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>

 <Dialog open={modalOpen} onOpenChange={setModalOpen}>
 <DialogContent className="sm:max-w-[425px]">
 <DialogHeader>
 <DialogTitle>{isEditing ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
 </DialogHeader>
 <form onSubmit={handleSave} className="space-y-4 pt-4">
 <div className="space-y-2">
 <Label>Nama Kategori <span className="text-red-500">*</span></Label>
 <Input 
 value={formData.name} 
 onChange={(e) => setFormData({...formData, name: e.target.value})} 
 required 
 placeholder="Misal: Biji Kopi"
 />
 </div>
 <div className="space-y-2">
 <Label>Deskripsi</Label>
 <Input 
 value={formData.description} 
 onChange={(e) => setFormData({...formData, description: e.target.value})} 
 placeholder="Opsional"
 />
 </div>
 <div className="flex justify-end gap-2 pt-4">
 <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
 <Button type="submit">Simpan</Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 )
}
