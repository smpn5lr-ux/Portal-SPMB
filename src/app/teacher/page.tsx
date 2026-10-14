
"use client"

import { useMemo } from 'react'
import { 
  BookOpen, 
  Users, 
  ChevronRight, 
  Star, 
  ClipboardCheck,
  Loader2,
  Backpack,
  CalendarDays,
  FileText
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { TeacherAssignment, Staff } from "@/lib/types"

export default function TeacherDashboard() {
  const { user } = useUser()
  const db = useFirestore()
  const searchParams = useSearchParams()

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'system') : null, [db])
  const { data: config } = useDoc<any>(settingsRef)

  // Ambil semester dari URL atau default sistem
  const selectedSemester = searchParams.get('semester') || config?.activeSemester?.toString() || "1"

  const staffQuery = useMemoFirebase(() => {
    if (!db || !user?.email) return null
    return query(collection(db, 'staff'), where('email', '==', user.email))
  }, [db, user])

  const { data: staffData } = useCollection<Staff>(staffQuery)
  const teacherId = staffData?.[0]?.id

  const assignmentsQuery = useMemoFirebase(() => {
    if (!db || !teacherId) return null
    return query(collection(db, 'teacherAssignments'), where('teacherId', '==', teacherId))
  }, [db, teacherId])

  const { data: assignments, loading } = useCollection<TeacherAssignment>(assignmentsQuery)

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Mata Pelajaran Anda</h1>
          <p className="text-muted-foreground mt-1">
            Mengelola nilai & jurnal untuk <span className="text-primary font-bold">Semester {selectedSemester}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-accent/10 px-4 py-2 rounded-xl border border-accent/20 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" />
            <span className="text-sm font-bold text-accent uppercase">SEMESTER {selectedSemester}</span>
          </div>
          <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary uppercase">{assignments?.length || 0} Kelas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments?.map((a) => (
          <Card key={a.id} className="border-border/50 transition-all shadow-sm hover:shadow-md h-full bg-card/40 backdrop-blur-sm relative group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-bold">KELAS {a.className}</Badge>
                <div className="bg-muted p-2 rounded-lg">
                  <Star className="w-4 h-4 text-muted-foreground fill-current" />
                </div>
              </div>
              <CardTitle className="text-xl font-headline mt-4">{a.subjectName}</CardTitle>
              <CardDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">Tingkat Menengah Pertama</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="gap-2 h-10 border-primary/20 hover:bg-primary/5">
                  <Link href={`/teacher/grading/${a.id}?semester=${selectedSemester}`}>
                    <ClipboardCheck className="w-4 h-4 text-primary" /> Buku Nilai
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-2 h-10 border-accent/20 hover:bg-accent/5">
                  <Link href={`/teacher/journal/${a.id}?semester=${selectedSemester}`}>
                    <FileText className="w-4 h-4 text-accent" /> Jurnal
                  </Link>
                </Button>
              </div>
              <div className="p-2 rounded-lg bg-muted/20 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aktivitas Terakhir</p>
                <p className="text-[11px] font-medium text-foreground">Semester {selectedSemester}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {assignments?.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
            <Backpack className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-xl font-bold">Belum Ada Penugasan</h3>
            <p className="text-muted-foreground">Hubungi Admin untuk plotting jadwal mengajar Anda.</p>
          </div>
        )}
      </div>
    </div>
  )
}
