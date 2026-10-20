"use client";
import React, { useEffect, useState } from"react";
import { Card, CardHeader, CardTitle, CardContent } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import api from"@/lib/api";
import Link from"next/link";
import { Loader2 } from"lucide-react";

export default function TimberOrdersList() {
 const [orders, setOrders] = useState([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");

 useEffect(() => {
 fetchOrders();
 }, []);

 const fetchOrders = async () => {
 try {
 setLoading(true);
 const res = await api.get("/sales/timber-orders");
 setOrders(res.data.data || []);
 } catch (err: any) {
 setError((err.response?.data?.error?.message || err.response?.data?.message) ||"Failed to load orders");
 } finally {
 setLoading(false);
 }
 };

 const getStatusColor = (status: string) => {
 switch(status) {
 case 'DRAFT': return 'bg-muted0';
 case 'CONFIRMED': return 'bg-blue-500';
 case 'PARTIALLY_FULFILLED': return 'bg-amber-500';
 case 'FULFILLED': return 'bg-emerald-500';
 case 'CANCELLED': return 'bg-red-500';
 default: return 'bg-muted0';
 }
 };

 return (
 <div className="p-6 space-y-6">
 <div className="flex justify-between items-center">
 <h1 className="text-2xl font-bold">Timber Sales Orders</h1>
 <button className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
 + Create Order
 </button>
 </div>
 
 {error && <div className="bg-red-100 text-red-600 p-3 rounded">{error}</div>}

 <Card>
 <CardHeader>
 <CardTitle>Orders</CardTitle>
 </CardHeader>
 <CardContent>
 {loading ? (
 <div className="flex justify-center p-4 md:p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-[600px] md:min-w-full w-full text-sm border-collapse">
 <thead>
 <tr className="border-b text-left bg-muted/30">
 <th className="p-3">Order Number</th>
 <th className="p-3">Customer</th>
 <th className="p-3">Date</th>
 <th className="p-3">Partai</th>
 <th className="p-3">Status</th>
 </tr>
 </thead>
 <tbody>
 {orders.length === 0 ? (
 <tr>
 <td colSpan={5} className="text-center p-6 text-muted-foreground">No orders found.</td>
 </tr>
 ) : (
 orders.map((order: any) => (
 <tr key={order.id} className="border-b hover:bg-muted/30 transition-colors">
 <td className="p-3">
 <Link href={`/sales/timber/orders/${order.id}`} className="text-blue-600 hover:underline">
 {order.orderNumber}
 </Link>
 </td>
 <td className="p-3">{order.customer?.name ||"-"}</td>
 <td className="p-3">{new Date(order.orderDate).toLocaleDateString()}</td>
 <td className="p-3">{order.partai ||"-"}</td>
 <td className="p-3">
 <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}

