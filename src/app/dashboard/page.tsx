
"use client"

import { useMemo } from "react"
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MapPin,
  Trophy,
  Heart,
  Truck,
  Loader2
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
import { useCollection, useFirestore } from "@/firebase"
import { collection } from "firebase/firestore"
import { Applicant } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

export default function OverviewPage() {
  const db = useFirestore()
  const { data: applicants, loading } = useCollection<Applicant>(db ? collection(db, 'applicants') : null)

  const stats = useMemo(() => {
    if (!applicants) return []
    const total = applicants.length
    const accepted = applicants.filter(a => a.admissionStatus === 'accepted').length
    const pending = applicants.filter(a => a.verificationStatus === 'Belum Diverifikasi').length
    const rejected = applicants.filter(a => a.verificationStatus === 'Ditolak').length

    return [
      { name: 'Total Pendaftar', value: total.toLocaleString(), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
      { name: 'Siswa Diterima', value: accepted.toLocaleString(), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
      { name: 'Menunggu Verifikasi', value: pending.toLocaleString(), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { name: 'Pendaftaran Ditolak', value: rejected.toLocaleString(), icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    ]
  }, [applicants])

  const pathStats = useMemo(() => {
    if (!applicants) return []
    const paths = ['Zonasi', 'Prestasi', 'Afirmasi', 'Perpindahan Orang Tua']
    const colors = ['#4361EE', '#00B4D8', '#F72585', '#7209B7']
    const icons = [MapPin, Trophy, Heart, Truck]

    return paths.map((p, i) => {
      const count = applicants.filter(a => a.applicationPath === p).length
      const percentage = applicants.length ? Math.round((count / applicants.length) * 100) : 0
      return { name: p, value: percentage, icon: icons[i], color: colors[i] }
    })
  }, [applicants])

  const chartData = [
    { day: 'Sen', count: 45 },
    { day: 'Sel', count: 52 },
    { day: 'Rab', count: 38 },
    { day: 'Kam', count: 65 },
    { day: 'Jum', count: 48 },
    { day: 'Sab', count: 22 },
    { day: 'Min', count: 15 },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Ringkasan Sistem</h1>
          <p className="text-muted-foreground mt-1">Status penerimaan murid baru dari database real-time.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 rounded-md">Live Update</span>
          <span className="text-[10px] text-muted-foreground mr-2 font-mono uppercase tracking-tighter">Connected to Firestore</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat) => (
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
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Statistik Pendaftaran Harian</CardTitle>
            <CardDescription>Tren pendaftaran selama 7 hari terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="w-full h-full flex items-end gap-2 pb-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 60 + 20}%` }} />
                ))}
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Distribusi Jalur</CardTitle>
            <CardDescription>Persentase pendaftar per jalur masuk.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              {loading ? (
                <Skeleton className="h-32 w-32 rounded-full" />
              ) : (
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
              )}
            </div>
            <div className="space-y-3 mt-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))
              ) : (
                pathStats.map((path) => (
                  <div key={path.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: path.color }}></div>
                      <span className="text-xs font-medium">{path.name}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{path.value}%</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
