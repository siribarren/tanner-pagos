import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

export default function ConciliacionDashboard() {
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-6">Tanner SF</h2>
          <nav className="space-y-3 text-gray-600">
            <div className="font-semibold text-black">Dashboard</div>
            <div>Conciliación</div>
            <div>Pagos</div>
            <div>Excepciones</div>
            <div>Auditoría</div>
            <div>Reportes</div>
            <div>Configuración</div>
          </nav>
        </div>
        <div className="text-xs text-gray-400">v1.0 Prototipo</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 space-y-6 overflow-auto">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Conciliación Bancaria</h1>
            <p className="text-gray-500">Gestión y control de pagos</p>
          </div>
          <Button className="rounded-2xl">+ Nueva Conciliación</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-6">
          {["Pagos Hoy", "Conciliados", "Pendientes", "Errores"].map((kpi, i) => (
            <motion.div key={i} whileHover={{ scale: 1.05 }}>
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="text-sm text-gray-500">{kpi}</div>
                  <div className="text-2xl font-bold mt-2">
                    {i === 0 && "120"}
                    {i === 1 && "85%"}
                    {i === 2 && "32"}
                    {i === 3 && "8"}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="conciliacion">
          <TabsList className="bg-white rounded-2xl p-2 shadow-sm">
            <TabsTrigger value="conciliacion">Conciliación</TabsTrigger>
            <TabsTrigger value="excepciones">Excepciones</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          {/* Conciliación Tab */}
          <TabsContent value="conciliacion">
            <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">

              {/* Search */}
              <div className="flex items-center gap-2 border rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por monto, cliente o referencia..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-none focus:ring-0"
                />
              </div>

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>10-05-2026</TableCell>
                    <TableCell>$120.000</TableCell>
                    <TableCell>Automotora XYZ</TableCell>
                    <TableCell className="text-green-600">Conciliado</TableCell>
                    <TableCell><Button size="sm">Ver</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>10-05-2026</TableCell>
                    <TableCell>$85.000</TableCell>
                    <TableCell>Cliente ABC</TableCell>
                    <TableCell className="text-orange-500">Pendiente</TableCell>
                    <TableCell><Button size="sm">Conciliar</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Excepciones Tab */}
          <TabsContent value="excepciones">
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                Gestión de pagos con errores, diferencias o falta de información.
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historial Tab */}
          <TabsContent value="historial">
            <Card className="rounded-2xl">
              <CardContent className="p-6">
                Auditoría completa de conciliaciones y trazabilidad.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
