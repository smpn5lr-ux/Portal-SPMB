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
  User
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, limit } from "firebase/firestore"
import { Applicant } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

export default function OverviewPage() {
  const db = useFirestore()
  
  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'applicants'), limit(500))
  }, [db])

  const { data: applicants, loading } = useCollection<Applicant>(applicantsQuery)

  const stats = useMemo(() => {
    if (!applicants) return []
    const total = applicants.length
    const accepted = applicants.filter(a => a.admissionStatus === 'accepted').length
    const pending = applicants.filter(a => a.verificationStatus === 'Belum Diverifikasi').length
    const rejected = applicants.filter(a => a.verificationStatus === 'Ditolak').length

    return [
      { name: 'Total Pendaftar', value: total.toLocaleString(), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
      { name: 'Murid Diterima', value: accepted.toLocaleString(), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
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

  const genderStats = useMemo(() => {
    if (!applicants) return []
    const male = applicants.filter(a => a.gender === 'Laki-laki').length
    const female = applicants.filter(a => a.gender === 'Perempuan').length
    return [
      { name: 'Laki-laki', value: male, color: '#4361EE' },
      { name: 'Perempuan', value: female, color: '#F72585' },
    ]
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

  const skeletonHeights = [40, 60, 35, 75, 50, 25, 45];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 fill-mode-both">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Ringkasan Sistem</h1>
          <p className="text-muted-foreground mt-1">Status penerimaan murid (Dianalisis dari 500 pendaftar terbaru).</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 rounded-md">Live Database</span>
          <span className="text-[10px] text-muted-foreground mr-2 font-mono uppercase tracking-tighter">Sinkronisasi Real-time</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-muted/20" />
                    <Skeleton className="h-8 w-16 bg-muted/20" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-xl bg-muted/20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat) => (
            <Card key={stat.name} className="border-border/50 hover:border-primary/50 transition-all duration-300 animate-in zoom-in-95 duration-500">
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
        <Card className="lg:col-span-2 border-border/50 bg-card overflow-hidden">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Statistik Pendaftaran Harian</CardTitle>
            <CardDescription>Tren pendaftaran murid selama 7 hari terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="w-full h-full flex items-end gap-2 pb-4">
                {skeletonHeights.map((h, i) => (
                  <Skeleton key={i} className="flex-1 bg-muted/10" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <div className="w-full h-full animate-in fade-in duration-1000">
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
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Distribusi Jalur</CardTitle>
              <CardDescription>Persentase pendaftar per jalur masuk.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] flex items-center justify-center">
                {loading ? (
                  <Skeleton className="h-28 w-28 rounded-full bg-muted/10" />
                ) : (
                  <div className="w-full h-full animate-in zoom-in-90 duration-700">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pathStats}
                          innerRadius={50}
                          outerRadius={70}
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
                )}
              </div>
              <div className="space-y-2 mt-4">
                {pathStats.map((path) => (
                  <div key={path.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: path.color }}></div>
                      <span className="text-[10px] font-medium">{path.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{path.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Distribusi Gender
              </CardTitle>
              <CardDescription className="text-xs">Perbandingan murid Laki-laki & Perempuan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[100px] flex items-center justify-center">
                {loading ? (
                  <Skeleton className="h-16 w-16 rounded-full bg-muted/10" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderStats}
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {genderStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {genderStats.map((stat) => (
                  <div key={stat.name} className="bg-muted/30 p-2 rounded-lg border border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{stat.name}</p>
                    <p className="text-sm font-bold">{stat.value} <span className="text-[8px] font-normal">Murid</span></p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
