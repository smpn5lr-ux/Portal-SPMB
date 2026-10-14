
"use client"

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Info,
  Search,
  Calendar,
  BookOpen,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc, writeBatch } from "firebase/firestore"
import { TeacherAssignment, Applicant, Classroom, Assessment } from "@/lib/types"
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

export default function GradingPage() {
  const { assignmentId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const db = useFirestore()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const settingsRef = useMemoFirebase(() => {
    if (!db || userLoading || !user) return null
    return doc(db, 'settings', 'system')
  }, [db, user, userLoading])
  
  const { data: config } = useDoc<any>(settingsRef)

  const activeSemester = parseInt(searchParams.get('semester') || config?.activeSemester?.toString() || "1")

  const assignmentRef = useMemoFirebase(() => {
    if (!db || !assignmentId || userLoading || !user) return null
    return doc(db, 'teacherAssignments', assignmentId as string)
  }, [db, assignmentId, user, userLoading])
  
  const { data: assignment, loading: loadingA } = useDoc<TeacherAssignment>(assignmentRef)

  const classRef = useMemoFirebase(() => {
    if (!db || !assignment || userLoading || !user) return null
    return doc(db, 'classes', assignment.classId)
  }, [db, assignment, user, userLoading])
  
  const { data: classroom, loading: loadingC } = useDoc<Classroom>(classRef)

  const studentsQuery = useMemoFirebase(() => {
    if (!db || userLoading || !user) return null 
    return query(collection(db, 'applicants'), where('admissionStatus', '==', 'accepted'))
  }, [db, user, userLoading])
  const { data: allAcceptedStudents, loading: loadingS } = useCollection<Applicant>(studentsQuery)

  const students = useMemo(() => {
    if (!allAcceptedStudents || !classroom?.students) return []
    return allAcceptedStudents
      .filter(s => classroom.students.includes(s.id) && !s.isDeleted)
      .filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || (s.NISN || "").includes(searchTerm))
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allAcceptedStudents, classroom, searchTerm])

  const assessmentsQuery = useMemoFirebase(() => {
    if (!db || userLoading || !user || !assignmentId) return null
    return query(
      collection(db, 'assessments'), 
      where('assignmentId', '==', assignmentId)
    )
  }, [db, user, userLoading, assignmentId])
  
  const { data: rawAssessments } = useCollection<Assessment>(assessmentsQuery)

  const [grades, setGrades] = useState<Record<string, Partial<Assessment>>>({})

  useEffect(() => {
    if (rawAssessments) {
      const gMap: Record<string, Partial<Assessment>> = {}
      rawAssessments.filter(a => a.semester === activeSemester).forEach(a => {
        gMap[a.studentId] = a
      })
      setGrades(gMap)
    }
  }, [rawAssessments, activeSemester])

  const handleGradeChange = (studentId: string, field: keyof Assessment, value: string) => {
    const numValue = Math.min(100, Math.max(0, parseInt(value) || 0))
    setGrades(prev => {
      const current = prev[studentId] || { studentId, assignmentId: assignmentId as string, semester: activeSemester }
      const updated = { ...current, [field]: numValue }
      
      const att = (updated.attendance || 0) * 0.1
      const t1 = updated.task1 || 0
      const t2 = updated.task2 || 0
      const t3 = updated.task3 || 0
      const tg = updated.groupTask || 0
      const avgTasks = ((t1 + t2 + t3 + tg) / 4) * 0.4
      const mid = (updated.midExam || 0) * 0.2
      const fin = (updated.finalExam || 0) * 0.3
      
      updated.finalScore = Math.round(att + avgTasks + mid + fin)
      
      return { ...prev, [studentId]: updated }
    })
  }

  const saveAllGrades = async () => {
    if (!db || !activeSemester || !user) return
    setIsSaving(true)
    const batch = writeBatch(db)
    
    try {
      Object.entries(grades).forEach(([studentId, data]) => {
        const docId = `${assignmentId}_${studentId}_sem${activeSemester}`
        const ref = doc(db, 'assessments', docId)
        batch.set(ref, {
          ...data,
          studentId,
          assignmentId,
          semester: activeSemester,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      })
      
      await batch.commit()
      toast({ title: "Buku Nilai Disimpan" })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!assignment || !students.length) return
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF('landscape')
      
      const dinasName = config?.dinasName || "DINAS PENDIDIKAN"
      const schoolName = config?.schoolName || "SIS TERPADU"
      
      doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(67, 97, 238)
      doc.text(dinasName.toUpperCase(), 148, 15, { align: "center" })
      doc.text(schoolName.toUpperCase(), 148, 22, { align: "center" })
      doc.setDrawColor(67, 97, 238).setLineWidth(0.5).line(14, 26, 283, 26)

      doc.setFontSize(14).setTextColor(0).text(`LAPORAN NILAI SISWA - SEMESTER ${activeSemester}`, 14, 38)
      doc.setFontSize(10).setTextColor(100)
      doc.text(`Mata Pelajaran: ${assignment.subjectName}`, 14, 45)
      doc.text(`Kelas: ${assignment.className} | Guru: ${user?.displayName || '-'}`, 14, 51)
      
      const tableData = students.map((s, idx) => {
        const g = grades[s.id] || {}
        return [
          idx + 1,
          s.fullName,
          s.NISN,
          g.attendance || 0,
          g.task1 || 0,
          g.task2 || 0,
          g.task3 || 0,
          g.groupTask || 0,
          g.midExam || 0,
          g.finalExam || 0,
          g.finalScore || 0
        ]
      })

      autoTable(doc, {
        head: [['No', 'Nama Murid', 'NISN', 'Absen', 'Tgs 1', 'Tgs 2', 'Tgs 3', 'Ulangan', 'UTS', 'UAS', 'Total']],
        body: tableData,
        startY: 58,
        theme: 'striped',
        headStyles: { fillColor: [67, 97, 238], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 2 }
      })

      doc.save(`Nilai_${assignment.subjectName}_Kelas_${assignment.className}_Smt${activeSemester}.pdf`)
      toast({ title: "Berhasil Mengunduh", description: "Buku nilai telah disimpan sebagai PDF." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal ekspor PDF" })
    } finally {
      setIsExporting(false)
    }
  }

  if (userLoading || loadingA || loadingC || loadingS) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
      <p className="text-sm text-muted-foreground animate-pulse">Memuat buku nilai...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full border"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
               <h1 className="text-2xl font-bold">{assignment?.subjectName}</h1>
               <Badge variant="secondary">SEMESTER {activeSemester}</Badge>
            </div>
            <p className="text-muted-foreground text-sm font-bold text-primary">Kelas {assignment?.className}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari murid..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-48 bg-muted/20"
            />
          </div>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="gap-2 border-primary/30">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Cetak PDF
          </Button>
          <Button asChild variant="outline" className="gap-2 border-accent/30 text-accent">
            <Link href={`/teacher/journal/${assignmentId}?semester=${activeSemester}`}><BookOpen className="w-4 h-4" /> Jurnal & Absensi</Link>
          </Button>
          <Button onClick={saveAllGrades} disabled={isSaving} className="gap-2 shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Nilai
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="border-border/50 shadow-md overflow-x-auto bg-card/30">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="min-w-[180px] font-bold text-foreground">Murid</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold text-muted-foreground">Absensi</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold text-primary">Tgs 1</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold text-primary">Tgs 2</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold text-primary">Tgs 3</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold text-accent">Ulangan</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold text-foreground">UTS</TableHead>
                  <TableHead className="w-16 text-center text-[10px] uppercase font-bold text-foreground">UAS</TableHead>
                  <TableHead className="w-24 text-center font-bold text-primary">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => {
                  const sGrade = grades[s.id] || {}
                  const isBelowKKM = (sGrade.finalScore || 0) < 75 && (sGrade.finalScore !== undefined)
                  
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-xs truncate max-w-[150px]">{s.fullName}</div>
                        <div className="text-[9px] text-muted-foreground font-mono">{s.NISN}</div>
                      </TableCell>
                      <TableCell><Input type="number" value={sGrade.attendance || ""} readOnly className="h-8 text-center text-[10px] bg-muted/50 cursor-not-allowed" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.task1 || ""} onChange={e => handleGradeChange(s.id, 'task1', e.target.value)} className="h-8 text-center text-[10px] bg-background" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.task2 || ""} onChange={e => handleGradeChange(s.id, 'task2', e.target.value)} className="h-8 text-center text-[10px] bg-background" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.task3 || ""} onChange={e => handleGradeChange(s.id, 'task3', e.target.value)} className="h-8 text-center text-[10px] bg-background" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.groupTask || ""} onChange={e => handleGradeChange(s.id, 'groupTask', e.target.value)} className="h-8 text-center text-[10px] bg-background" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.midExam || ""} onChange={e => handleGradeChange(s.id, 'midExam', e.target.value)} className="h-8 text-center text-[10px] bg-background" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.finalExam || ""} onChange={e => handleGradeChange(s.id, 'finalExam', e.target.value)} className="h-8 text-center text-[10px] bg-background" /></TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={!isBelowKKM ? 'default' : 'destructive'} 
                          className={`w-14 justify-center py-1 text-xs font-bold ${!isBelowKKM && sGrade.finalScore ? 'bg-green-500' : ''}`}
                        >
                          {sGrade.finalScore || 0}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Info className="w-4 h-4" /> Bobot Nilai
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[10px] leading-relaxed">
              <div className="flex justify-between"><span>Kehadiran</span><span className="font-bold">10%</span></div>
              <div className="flex justify-between"><span>Tugas (Rata-rata)</span><span className="font-bold">40%</span></div>
              <div className="flex justify-between"><span>UTS</span><span className="font-bold">20%</span></div>
              <div className="flex justify-between"><span>UAS</span><span className="font-bold">30%</span></div>
              <Separator className="my-2" />
              <p className="text-muted-foreground italic">"Nilai Tugas & Absensi diisi melalui Jurnal."</p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" /> Statistik Kelas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tuntas (75+)</span>
                <span className="font-bold text-green-500">{Object.values(grades).filter(g => (g.finalScore || 0) >= 75 && students.some(s => s.id === g.studentId)).length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" /> <span>Remedial (&lt;75)</span>
                </div>
                <span className="font-bold">{Object.values(grades).filter(g => (g.finalScore || 0) < 75 && g.finalScore !== undefined && students.some(s => s.id === g.studentId)).length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
