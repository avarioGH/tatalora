"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card"

export default function InventoryUnits() {
 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-[28px] font-bold tracking-tight text-foreground">Units</h1>
 <p className="text-muted-foreground">Manage units data here.</p>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>Units Overview</CardTitle>
 <CardDescription>This page is currently under construction.</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="h-64 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground">
 Coming Soon in Phase 2/3
 </div>
 </CardContent>
 </Card>
 </div>
 )
}
