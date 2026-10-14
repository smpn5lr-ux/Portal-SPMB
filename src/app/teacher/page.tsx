
"use client"

import { useMemo } from 'react'
import { 
  BookOpen, 
  Users, 
  ChevronRight, 
  Star, 
  ClipboardCheck,
  Loader2,
  Backpack
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { collection, query, where } from "firebase/firestore"
import { TeacherAssignment, Staff } from "@/lib/types"

export default function TeacherDashboard() {
  const { user } = useUser()
  const db = useFirestore()

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
          <p className="text-muted-foreground mt-1">Daftar kelas dan mata pelajaran yang Anda ampu semester ini.</p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary uppercase">{assignments?.length || 0} Penugasan</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments?.map((a) => (
          <Card key={a.id} className="border-border/50 hover:border-primary/40 transition-all group shadow-sm hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-bold">KELAS {a.className}</Badge>
                <div className="bg-muted p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                  <Star className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl font-headline mt-4">{a.subjectName}</CardTitle>
              <CardDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60">Tingkat Menengah Pertama</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Tugas</p>
                    <p className="text-lg font-bold">30%</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">UTS/UAS</p>
                    <p className="text-lg font-bold">60%</p>
                  </div>
                </div>
                <Button asChild className="w-full gap-2 group/btn h-11">
                  <Link href={`/teacher/grading/${a.id}`}>
                    <ClipboardCheck className="w-4 h-4" />
                    Input Nilai Murid
                    <ChevronRight className="w-4 h-4 ml-auto group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
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
