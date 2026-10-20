"use client"

import { useState, useEffect } from "react"
import { MasterDataAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Search, Edit, Trash2, Loader2, CheckSquare } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function LocationPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({ warehouseId: "", code: "", name: "", description: "", isActive: true })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await MasterDataAPI.getLocations()
      if (res) setData(Array.isArray(res) ? res : res.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await MasterDataAPI.updateLocation(editingId, formData)
      } else {
        await MasterDataAPI.createLocation(formData)
      }
      setModalOpen(false)
      fetchData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleEdit = (item: any) => {
    setFormData({ ...item })
    setEditingId(item.id)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await MasterDataAPI.deleteLocation(id)
        fetchData()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const openNew = () => {
    setFormData({ warehouseId: "", code: "", name: "", description: "", isActive: true })
    setEditingId(null)
    setModalOpen(true)
  }

  const filteredData = (Array.isArray(data) ? data : []).filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  )

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">Location Master Data</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse ID</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center">No data found</TableCell></TableRow>
                  ) : paginatedData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.warehouseId}</TableCell>
                      <TableCell>{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.isActive ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            
            <div className="space-y-2">
              <Label>Warehouse ID</Label>
              <Input 
                type="text" 
                required 
                value={formData.warehouseId} 
                onChange={(e) => setFormData({...formData, warehouseId: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Code</Label>
              <Input 
                type="text" 
                required 
                value={formData.code} 
                onChange={(e) => setFormData({...formData, code: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                type="text" 
                required 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                type="text" 
                required 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isActive"
                checked={formData.isActive} 
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
