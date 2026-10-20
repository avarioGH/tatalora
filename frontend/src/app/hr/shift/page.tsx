"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Clock, Calendar, Users, AlertCircle } from "lucide-react";
import { HrAPI } from "@/lib/api";

export default function HrShift() {
  const [activeTab, setActiveTab] = useState("master");

  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Form states for Shift
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftFormData, setShiftFormData] = useState({
    code: "",
    name: "",
    start_time: "08:00",
    end_time: "16:00",
    grace_period_minutes: 15,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftsData, empData] = await Promise.all([
        HrAPI.getShifts().catch(() => []),
        HrAPI.getEmployees().catch(() => []),
      ]);
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleShiftSave = async () => {
    try {
      if (editingShiftId) {
        await HrAPI.updateShift(editingShiftId, shiftFormData);
      } else {
        await HrAPI.createShift(shiftFormData);
      }
      setShowShiftForm(false);
      setEditingShiftId(null);
      setShiftFormData({ code: "", name: "", start_time: "08:00", end_time: "16:00", grace_period_minutes: 15 });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save shift");
    }
  };

  const handleEditShift = (shift: any) => {
    setEditingShiftId(shift.id || shift._id);
    setShiftFormData({
      code: shift.code || "",
      name: shift.name || "",
      start_time: shift.start_time || "08:00",
      end_time: shift.end_time || "16:00",
      grace_period_minutes: shift.grace_period_minutes || 15,
    });
    setShowShiftForm(true);
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;
    try {
      await HrAPI.deleteShift(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete shift");
    }
  };

  const handleAssignShift = async (employeeId: string, shiftId: string) => {
    try {
      await HrAPI.assignShift(employeeId, shiftId);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to assign shift");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="w-8 h-8 text-primary" /> Pengaturan Shift
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1">Kelola jam kerja dan jadwal shift pegawai.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border shadow-sm">
          <TabsTrigger value="master" className="gap-2"><Clock className="w-4 h-4" /> Master Shift</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Calendar className="w-4 h-4" /> Jadwal Pegawai</TabsTrigger>
        </TabsList>

        <TabsContent value="master">
          {showShiftForm ? (
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>{editingShiftId ? "Edit Shift" : "Tambah Shift"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kode</Label>
                    <Input 
                      value={shiftFormData.code} 
                      onChange={(e) => setShiftFormData({...shiftFormData, code: e.target.value})} 
                      placeholder="SHF-PAGI" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Shift</Label>
                    <Input 
                      value={shiftFormData.name} 
                      onChange={(e) => setShiftFormData({...shiftFormData, name: e.target.value})} 
                      placeholder="Shift Pagi" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Jam Mulai</Label>
                    <Input 
                      type="time" 
                      value={shiftFormData.start_time} 
                      onChange={(e) => setShiftFormData({...shiftFormData, start_time: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Jam Selesai</Label>
                    <Input 
                      type="time" 
                      value={shiftFormData.end_time} 
                      onChange={(e) => setShiftFormData({...shiftFormData, end_time: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Batas Toleransi Keterlambatan (Menit)</Label>
                    <Input 
                      type="number" 
                      value={shiftFormData.grace_period_minutes} 
                      onChange={(e) => setShiftFormData({...shiftFormData, grace_period_minutes: parseInt(e.target.value) || 0})} 
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowShiftForm(false)}>Batal</Button>
                  <Button onClick={handleShiftSave}>Simpan</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
                <div>
                  <CardTitle>Master Data Shift</CardTitle>
                  <CardDescription>Daftar template jam kerja perusahaan.</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => {
                  setEditingShiftId(null);
                  setShiftFormData({ code: "", name: "", start_time: "08:00", end_time: "16:00", grace_period_minutes: 15 });
                  setShowShiftForm(true);
                }}>
                  <Plus className="w-4 h-4" /> Tambah Shift
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-accent/50">
                    <TableRow>
                      <TableHead className="font-semibold">Kode</TableHead>
                      <TableHead className="font-semibold">Nama Shift</TableHead>
                      <TableHead className="font-semibold text-center">Jam Mulai</TableHead>
                      <TableHead className="font-semibold text-center">Jam Selesai</TableHead>
                      <TableHead className="font-semibold text-center">Toleransi</TableHead>
                      <TableHead className="text-right font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-4">Loading...</TableCell></TableRow>
                    ) : shifts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-4">Belum ada data shift.</TableCell></TableRow>
                    ) : (
                      shifts.map((shift) => (
                        <TableRow key={shift.id || shift._id} className="hover:bg-accent/50">
                          <TableCell className="font-medium text-muted-foreground">{shift.code}</TableCell>
                          <TableCell className="font-bold">{shift.name}</TableCell>
                          <TableCell className="text-center">{shift.start_time}</TableCell>
                          <TableCell className="text-center">{shift.end_time}</TableCell>
                          <TableCell className="text-center">{shift.grace_period_minutes} Menit</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10" onClick={() => handleEditShift(shift)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDeleteShift(shift.id || shift._id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
              <div>
                <CardTitle>Penugasan Shift</CardTitle>
                <CardDescription>Jadwal shift default untuk setiap pegawai.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-accent/50">
                  <TableRow>
                    <TableHead className="font-semibold">Nama Pegawai</TableHead>
                    <TableHead className="font-semibold">Departemen</TableHead>
                    <TableHead className="font-semibold">Shift Saat Ini</TableHead>
                    <TableHead className="font-semibold">Assign Shift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4">Loading...</TableCell></TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4">Belum ada data pegawai.</TableCell></TableRow>
                  ) : (
                    employees.map((emp) => (
                      <TableRow key={emp.id || emp._id} className="hover:bg-accent/50">
                        <TableCell className="font-bold">{emp.name}</TableCell>
                        <TableCell className="text-muted-foreground">{emp.department?.name || emp.department || '-'}</TableCell>
                        <TableCell>
                          {emp.default_shift_id || emp.shift?.name ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                              {emp.shift?.name || 'Assigned'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic">Belum ada shift</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <select 
                            className="w-full border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={emp.default_shift_id || emp.shift?.id || ''}
                            onChange={(e) => handleAssignShift(emp.id || emp._id, e.target.value)}
                          >
                            <option value="">-- Pilih Shift --</option>
                            {shifts.map((shift) => (
                              <option key={shift.id || shift._id} value={shift.id || shift._id}>
                                {shift.name} ({shift.start_time} - {shift.end_time})
                              </option>
                            ))}
                          </select>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
