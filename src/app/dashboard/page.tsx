"use client"

import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  MapPin,
  Trophy,
  Heart,
  Truck
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts"

const stats = [
  { name: 'Total Pendaftar', value: '1,284', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { name: 'Siswa Diterima', value: '312', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  { name: 'Menunggu Verifikasi', value: '86', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { name: 'Data Tidak Lengkap', value: '12', icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
]

const pathStats = [
  { name: 'Zonasi', value: 45, icon: MapPin, color: '#4361EE' },
  { name: 'Prestasi', value: 30, icon: Trophy, color: '#00B4D8' },
  { name: 'Afirmasi', value: 15, icon: Heart, color: '#F72585' },
  { name: 'Perpindahan', value: 10, icon: Truck, color: '#7209B7' },
]

const chartData = [
  { day: 'Sen', count: 45 },
  { day: 'Sel', count: 52 },
  { day: 'Rab', count: 38 },
  { day: 'Kam', count: 65 },
  { day: 'Jum', count: 48 },
  { day: 'Sab', count: 22 },
  { day: 'Min', count: 15 },
]

export default function OverviewPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Ringkasan Sistem</h1>
          <p className="text-muted-foreground mt-1">Status penerimaan murid baru tahun ajaran 2024/2025.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 rounded-md">Live Update</span>
          <span className="text-[10px] text-muted-foreground mr-2 font-mono uppercase tracking-tighter">Last sync: 2 min ago</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-border/50 hover:border-primary/50 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-green-500 uppercase">
                <TrendingUp className="w-3 h-3" />
                <span>+12% dari kemarin</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Statistik Pendaftaran Harian</CardTitle>
            <CardDescription>Tren pendaftaran selama 7 hari terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Distribusi Jalur</CardTitle>
            <CardDescription>Persentase pendaftar per jalur masuk.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pathStats}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pathStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {pathStats.map((path) => (
                <div key={path.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: path.color }}></div>
                    <span className="text-xs font-medium">{path.name}</span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{path.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline text-lg">Kapasitas Rombel</CardTitle>
              <CardDescription>Status keterisian kelas saat ini.</CardDescription>
            </div>
            <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded">
              GELOMBANG 1
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {['7-A', '7-B', '7-C'].map((kelas) => (
              <div key={kelas} className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Kelas {kelas}</span>
                  <span className="text-muted-foreground">28 / 32 Siswa</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[85%]"></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Aktivitas Terakhir</CardTitle>
            <CardDescription>Log sistem penerimaan terbaru.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-bold">Operator Mentari</span> memverifikasi data <span className="text-primary font-medium">Budi Santoso</span>.
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Today at 10:45 AM</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
