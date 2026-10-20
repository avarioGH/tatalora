"use client"
import { HrAPI } from"@/lib/api"
import { formatCurrency } from"@/lib/format"
import { useState, useEffect } from"react"
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card"
import { Button } from"@/components/ui/button"
import { Input } from"@/components/ui/input"
import { Label } from"@/components/ui/label"
import { Plus, Fingerprint, CheckCircle2, ScanFace, Loader2, Edit, Trash } from"lucide-react"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from"@/components/ui/dialog"

export default function EmployeesPage() {
 const [employees, setEmployees] = useState<any[]>([])
 const [departments, setDepartments] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [showForm, setShowForm] = useState(false)
 const [formData, setFormData] = useState({ 
 firstName:"", 
 lastName:"",
 email:"",
 position:"",
 basicSalary:""
 })

 // Biometric Modal State
 const [bioModalOpen, setBioModalOpen] = useState(false)
 const [selectedEmp, setSelectedEmp] = useState<any>(null)
 const [bioStatus, setBioStatus] = useState<'idle' | 'scanning_right' | 'scanning_left' | 'done'>('idle')

 
 const deleteEmp = async (id: string) => {
   if(confirm("Yakin hapus karyawan ini?")) {
     await HrAPI.deleteEmployee(id);
     fetchData();
   }
 }
 
 const editEmp = (emp: any) => {
   setFormData({
     firstName: emp.first_name,
     lastName: emp.last_name,
     email: emp.email || "",
     position: emp.position || "",
     basicSalary: emp.basic_salary || ""
   });
   setShowForm(true);
 }

 const fetchData = async () => {
 try {
 setLoading(true)
 const [empRes, depRes] = await Promise.all([
 HrAPI.getEmployees(),
 HrAPI.getDepartments()
 ])
 
 if (empRes) setEmployees(empRes)
 if (depRes) setDepartments(depRes)
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
 await HrAPI.createEmployee({
 firstName: formData.firstName,
 lastName: formData.lastName,
 email: formData.email,
 position: formData.position,
 basicSalary: Number(formData.basicSalary)
 })
 setShowForm(false)
 setFormData({ firstName:"", lastName:"", email:"", position:"", basicSalary:"" })
 fetchData()
 } catch (e) {
 console.error(e)
 }
 }

 const openBioModal = (emp: any) => {
 setSelectedEmp(emp)
 setBioStatus('idle')
 setBioModalOpen(true)
 }

 const startScanning = async () => {
 // Simulate biometric scanning process
 setBioStatus('scanning_right')
 await new Promise(r => setTimeout(r, 2000)) // scan right
 setBioStatus('scanning_left')
 await new Promise(r => setTimeout(r, 2000)) // scan left
 
 // Save to backend
 try {
 await HrAPI.registerBiometric(selectedEmp.id, {
 employeeId: selectedEmp.id,
 rightThumb:"base64_simulated_right_thumb_template",
 leftThumb:"base64_simulated_left_thumb_template"
 })
 
 setBioStatus('done')
 fetchData() // Refresh list
 } catch (e) {
 console.error(e)
 setBioStatus('idle')
 }
 }

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Employees</h1>
 <p className="text-muted-foreground">Manage your workforce and biometrics.</p>
 </div>
 <Button onClick={() => setShowForm(!showForm)}>
 <Plus className="mr-2 h-4 w-4" />
 Add Employee
 </Button>
 </div>

 {showForm && (
 <Card>
 <form onSubmit={handleSave}>
 <CardHeader>
 <CardTitle>New Employee</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>First Name</Label>
 <Input required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
 </div>
 <div className="space-y-2">
 <Label>Last Name</Label>
 <Input required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
 </div>
 </div>
 <div className="space-y-2">
 <Label>Email</Label>
 <Input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Position</Label>
 <Input required value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} />
 </div>
 <div className="space-y-2">
 <Label>Basic Salary</Label>
 <Input type="number" required value={formData.basicSalary} onChange={(e) => setFormData({...formData, basicSalary: e.target.value})} />
 </div>
 </div>
 <Button type="submit" className="w-full">Save Employee</Button>
 </CardContent>
 </form>
 </Card>
 )}

 {loading ? (
 <div className="p-4 md:p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
 ) : (
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 {employees.map((emp) => (
 <Card key={emp.id}>
 <CardHeader className="pb-2">
 <CardTitle className="text-lg flex justify-between items-center">
 <span>{emp.first_name} {emp.last_name}</span>
 {emp.has_biometric ? (
 <span className="flex items-center text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">
 <CheckCircle2 className="h-3 w-3 mr-1" />
 Biometric Enrolled
 </span>
 ) : (
 <Button variant="outline" size="sm" onClick={() => openBioModal(emp)} className="h-7 text-xs">
 <Fingerprint className="h-3 w-3 mr-1" />
 Enroll
 </Button>
 )}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-sm text-muted-foreground space-y-1">
 <p><strong>Code:</strong> {emp.employee_code}</p>
 <p><strong>Position:</strong> {emp.position}</p>
 <p><strong>Email:</strong> {emp.email}</p>
 <p><strong>Salary:</strong> {formatCurrency(emp.basic_salary || 0)}</p>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 <Dialog open={bioModalOpen} onOpenChange={setBioModalOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Enroll Biometrics</DialogTitle>
 <DialogDescription>
 Connect hardware scanner to register fingerprint data.
 </DialogDescription>
 </DialogHeader>
 <div className="py-6 flex flex-col items-center justify-center space-y-4">
 {bioStatus === 'idle' && (
 <Button onClick={startScanning} className="w-full">
 <ScanFace className="mr-2 h-4 w-4" /> Start Hardware Scan
 </Button>
 )}
 
 {bioStatus === 'scanning_right' && (
 <div className="text-center space-y-2">
 <Fingerprint className="h-12 w-12 text-primary animate-pulse mx-auto" />
 <p className="text-sm font-medium">Place RIGHT THUMB on scanner...</p>
 </div>
 )}

 {bioStatus === 'scanning_left' && (
 <div className="text-center space-y-2">
 <Fingerprint className="h-12 w-12 text-primary animate-pulse mx-auto" />
 <p className="text-sm font-medium">Place LEFT THUMB on scanner...</p>
 </div>
 )}

 {bioStatus === 'done' && (
 <div className="text-center space-y-2">
 <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
 <p className="text-sm font-medium text-primary">Templates stored successfully!</p>
 <Button variant="outline" onClick={() => setBioModalOpen(false)} className="mt-4">Close</Button>
 </div>
 )}
 </div>
 </DialogContent>
 </Dialog>
 </div>
 )
}
