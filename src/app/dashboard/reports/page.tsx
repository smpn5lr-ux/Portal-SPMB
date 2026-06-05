"use client"

import { 
  FileDown, 
  TrendingUp, 
  Users, 
  School, 
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Download
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from "recharts"

const schoolData = [
  { name: 'SDN Menteng 01', count: 145 },
  { name: 'SDN Menteng 02', count: 98 },
  { name: 'SDN Gondangdia', count: 120 },
  { name: 'SD Swasta Jakarta', count: 85 },
  { name: 'MI Nurul Iman', count: 42 },
]

const ageData = [
  { name: '11 Tahun', value: 15 },
  { name: '12 Tahun', value: 65 },
  { name: '13 Tahun', value: 20 },
]

const COLORS = ['#4361EE', '#4CC9F0', '#F72585', '#7209B7', '#3A0CA3']

export default function ReportsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Laporan & Analitik</h1>
          <p className="text-muted-foreground mt-1">Visualisasi data pendaftaran dan statistik kelulusan.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" /> Filter Periode
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <FileDown className="w-4 h-4" /> Export Laporan PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Total Pendaftar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">1,284</div>
            <p className="text-xs text-green-500 mt-1 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +15.2% dari tahun lalu
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <School className="w-4 h-4 text-accent" /> Rata-rata Skor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">84.2</div>
            <p className="text-xs text-muted-foreground mt-1">Berdasarkan 324 pendaftar jalur prestasi</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-500" /> Sisa Kuota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">28</div>
            <p className="text-xs text-amber-500 mt-1 font-bold">Menuju kapasitas maksimal (92%)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg">Asal Sekolah Terbanyak</CardTitle>
                <CardDescription>Penyebaran pendaftar berdasarkan sekolah dasar asal.</CardDescription>
              </div>
              <BarChart3 className="w-5 h-5 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={schoolData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={120}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg">Demografi Usia</CardTitle>
                <CardDescription>Distribusi umur calon siswa baru.</CardDescription>
              </div>
              <PieIcon className="w-5 h-5 text-muted-foreground/50" />
            </div>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4 pr-8">
              {ageData.map((age, i) => (
                <div key={age.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <div>
                    <p className="text-xs font-bold">{age.name}</p>
                    <p className="text-[10px] text-muted-foreground">{age.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-headline text-lg">Log Ekspor Data</CardTitle>
          <CardDescription>Riwayat pengunduhan data untuk laporan dinas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: 'Data Dapodik Kelulusan.csv', date: '24 Mei 2024, 14:20', user: 'Admin Pusat' },
              { label: 'Laporan Rekapitulasi Zonasi.pdf', date: '22 Mei 2024, 09:15', user: 'Operator 01' },
              { label: 'Daftar Hadir Verifikasi.xlsx', date: '20 Mei 2024, 16:45', user: 'Admin Pusat' },
            ].map((file) => (
              <div key={file.label} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Download className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{file.label}</p>
                    <p className="text-xs text-muted-foreground">Oleh {file.user} • {file.date}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-primary font-bold">Re-download</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
