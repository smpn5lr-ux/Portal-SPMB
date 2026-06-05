
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
import { format, subDays, isSameDay } from "date-fns"
import { id } from "date-fns/locale"

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
      { name: 'Total Murid Pendaftar', value: total.toLocaleString(), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
      { name: 'Murid Diterima', value: accepted.toLocaleString(), icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
      { name: 'Menunggu Verifikasi', value: pending.toLocaleString(), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { name: 'Pendaftaran Ditolak', value: rejected.toLocaleString(), icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    ]
  }, [applicants])

  const pathStats = useMemo(() => {
    if (!applicants || applicants.length === 0) return []
    const paths: Record<string, { count: number, color: string, icon: any }> = {
      'Zonasi': { count: 0, color: '#4361EE', icon: MapPin },
      'Prestasi': { count: 0, color: '#00B4D8', icon: Trophy },
      'Afirmasi': { count: 0, color: '#F72585', icon: Heart },
      'Perpindahan Orang Tua': { count: 0, color: '#7209B7', icon: Truck }
    }

    applicants.forEach(a => {
      if (paths[a.applicationPath]) {
        paths[a.applicationPath].count++
      }
    })

    return Object.entries(paths).map(([name, data]) => ({
      name,
      value: Math.round((data.count / applicants.length) * 100),
      color: data.color,
      icon: data.icon
    }))
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

  const chartData = useMemo(() => {
    if (!applicants) return []
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i)
      return {
        date,
        day: format(date, 'eee', { locale: id }),
        count: 0
      }
    })

    applicants.forEach(a => {
      const regDate = new Date(a.createdAt)
      const dayData = last7Days.find(d => isSameDay(d.date, regDate))
      if (dayData) {
        dayData.count++
      }
    })

    return last7Days.map(({ day, count }) => ({ day, count }))
  }, [applicants])

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Ringkasan Sistem</h1>
          <p className="text-muted-foreground mt-1">Status penerimaan murid berdasarkan data Firestore terbaru.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 rounded-md">Live Database</span>
          <span className="text-[10px] text-muted-foreground mr-2 font-mono uppercase tracking-tighter">Sinkronisasi Real-time</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))
        ) : (
          stats.map((stat) => (
            <Card key={stat.name} className="border-border/50 hover:border-primary/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.name}</p>
                    <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
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
            <CardTitle className="font-headline text-lg">Tren Pendaftaran 7 Hari Terakhir</CardTitle>
            <CardDescription>Grafik pendaftaran harian yang masuk ke database.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
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

        <div className="space-y-6">
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Distribusi Jalur Masuk</CardTitle>
              <CardDescription>Persentase pendaftar per jalur saat ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {loading ? (
                  <Skeleton className="h-full w-full rounded-full" />
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
                <User className="w-4 h-4 text-primary" /> Distribusi Jenis Kelamin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {loading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : (
                  genderStats.map((stat) => (
                    <div key={stat.name} className="bg-muted/30 p-3 rounded-xl border border-border/50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{stat.name}</p>
                      <p className="text-xl font-bold mt-1">{stat.value} <span className="text-[10px] font-normal text-muted-foreground">Murid</span></p>
                      <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full" 
                          style={{ 
                            backgroundColor: stat.color, 
                            width: `${applicants?.length ? (stat.value / applicants.length) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
