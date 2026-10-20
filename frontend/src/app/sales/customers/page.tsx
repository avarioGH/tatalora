"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  totalSales: number;
  totalPaid: number;
  totalOutstanding: number;
  totalPayable: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCustomers = async (searchQuery = "") => {
    try {
      setLoading(true);
      const res = await api.get('/customers', {
        params: { page: 1, limit: 50, search: searchQuery }
      });
      setCustomers(res.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(value || 0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pelanggan & Piutang</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Pelanggan</CardTitle>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Cari pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button type="submit" variant="secondary">
                <Search className="w-4 h-4 mr-2" />
                Cari
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>No. HP</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-right">Total Tagihan</TableHead>
                  <TableHead className="text-right">Total Dibayar</TableHead>
                <TableHead className="text-right">Piutang Kustomer</TableHead>
                <TableHead className="text-right">Hutang Kita (Vendor)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Tidak ada data pelanggan.
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => (
                    <TableRow 
                      key={c.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push("/sales/customers/" + c.id)}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone || "-"}</TableCell>
                      <TableCell>{c.address || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.totalSales)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.totalPaid)}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(c.totalOutstanding)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
