
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
  User,
  CalendarDays,
  School,
  BookOpen,
  UserCheck,
  GraduationCap
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
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, limit, doc } from "firebase/firestore"
import { Applicant, Classroom, Staff, Subject } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { format, subDays, isSameDay } from "date-fns"
import { id } from "date-fns/locale"
import Link from "next/link"

export default function OverviewPage() {
  const db = useFirestore()
  
  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'applicants'), limit(2000))
  }, [db])

  const classesQuery = useMemoFirebase(() => db ? collection(db, 'classes') : null, [db])
  const staffQuery = useMemoFirebase(() => db ? collection(db, 'staff') : null, [db])
  const subjectsQuery = useMemoFirebase(() => db ? collection(db, 'subjects') : null, [db])

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: allApplicants, loading: loadingApplicants } = useCollection<Applicant>(applicantsQuery)
  const { data: classes } = useCollection<Classroom>(classesQuery)
  const { data: staff } = useCollection<Staff>(staffQuery)
  const { data: subjects } = useCollection<Subject>(subjectsQuery)
  const { data: config, loading: loadingConfig } = useDoc<any>(settingsRef)

  const isSPMBEnabled = config?.enableSPMB !== false;

  const applicants = useMemo(() => {
    if (!allApplicants) return []
    return allApplicants.filter(a => !a.isDeleted)
  }, [allApplicants])

  const academicStats = [
    { name: 'Total Rombel', value: classes?.length || 0, icon: School, color: 'text-primary', bg: 'bg-primary/10', href: '/dashboard/classes' },
    { name: 'Staf & Guru', value: staff?.length || 0, icon: GraduationCap, color: 'text-accent', bg: 'bg-accent/10', href: '/dashboard/staff' },
    { name: 'Mata Pelajaran', value: subjects?.length || 0, icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-500/10', href: '/dashboard/subjects' },
    { name: 'Murid Aktif', value: applicants.filter(a => a.admissionStatus === 'accepted').length, icon: Users, color: 'text-green-500', bg: 'bg-green-500/10', href: '/dashboard/classes' },
  ]

  const spmbStats = useMemo(() => {
    if (!applicants) return []
    const total = applicants.length
    const pending = applicants.filter(a => a.verificationStatus === 'Belum Diverifikasi').length
    const rejected = applicants.filter(a => a.verificationStatus === 'Ditolak').length
    const totalQuota = config?.totalQuota || 0

    return [
      { name: 'Total Pendaftar', value: total, icon: Users, color: 'text-primary', bg: 'bg-primary/10', href: '/dashboard/applicants' },
      { name: 'Menunggu Verifikasi', value: pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', href: '/dashboard/verification' },
      { name: 'Pendaftaran Ditolak', value: rejected, icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', href: '/dashboard/verification' },
      { name: 'Kapasitas Sekolah', value: totalQuota, icon: CalendarDays, color: 'text-accent', bg: 'bg-accent/10', href: '/dashboard/selection' },
    ]
  }, [applicants, config])

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

  const loading = loadingApplicants || loadingConfig

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Ringkasan Sistem</h1>
          <p className="text-muted-foreground mt-1">Status operasional akademik dan pendaftaran sekolah.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border">
          <Badge variant={isSPMBEnabled ? "default" : "secondary"} className="gap-1 font-bold">
             <div className={`w-2 h-2 rounded-full ${isSPMBEnabled ? 'bg-green-400 animate-pulse' : 'bg-slate-400'}`}></div>
             MODUL SPMB: {isSPMBEnabled ? 'AKTIF' : 'NONAKTIF'}
          </Badge>
        </div>
      </div>

      {/* Ringkasan Akademik */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4" /> Manajemen Akademik
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : (
            academicStats.map((stat) => (
              <Link key={stat.name} href={stat.href} className="block">
                <Card className="border-border/50 hover:border-primary/50 transition-all group cursor-pointer h-full bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`${stat.bg} p-3 rounded-xl`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.name}</p>
                      <h3 className="text-xl font-bold">{stat.value}</h3>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Ringkasan SPMB (Jika Aktif) */}
      {isSPMBEnabled && (
        <section className="space-y-4 pt-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Users className="w-4 h-4" /> Penerimaan Murid Baru (SPMB)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : (
              spmbStats.map((stat) => (
                <Link key={stat.name} href={stat.href} className="block">
                  <Card className="border-primary/10 hover:border-primary/50 transition-all group cursor-pointer h-full bg-primary/5">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={`${stat.bg} p-3 rounded-xl`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.name}</p>
                        <h3 className="text-xl font-bold">{stat.value}</h3>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </section>
      )}

      {isSPMBEnabled && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          <Card className="lg:col-span-2 border-border/50 bg-card/30 overflow-hidden">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Tren Pendaftaran</CardTitle>
              <CardDescription>Grafik pendaftaran harian yang masuk ke database.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/30">
            <CardHeader>
              <CardTitle className="font-headline text-lg">Cek Status SPMB</CardTitle>
              <CardDescription>Status terkini operasional pendaftaran.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Kapasitas Terisi</span>
                    <span className="font-bold">{applicants.filter(a => a.admissionStatus === 'accepted').length} / {config?.totalQuota || 0}</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all" 
                      style={{ width: `${Math.min(100, (applicants.filter(a => a.admissionStatus === 'accepted').length / (config?.totalQuota || 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground italic">"Sistem otomatis menyeimbangkan kuota setiap kali ada pendaftar baru masuk."</p>
               </div>
               <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/settings">Kelola Mode Sistem</Link>
               </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
