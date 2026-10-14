
"use client"

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Calculation,
  User,
  Info
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
import { collection, query, where, doc, setDoc, writeBatch } from "firebase/firestore"
import { TeacherAssignment, Applicant, Classroom, Assessment } from "@/lib/types"
import { useToast } from '@/hooks/use-toast'

export default function GradingPage() {
  const { assignmentId } = useParams()
  const router = useRouter()
  const db = useFirestore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  
  // Ambil Data Assignment
  const assignmentRef = useMemoFirebase(() => db ? doc(db, 'teacherAssignments', assignmentId as string) : null, [db, assignmentId])
  const { data: assignment, loading: loadingA } = useDoc<TeacherAssignment>(assignmentRef)

  // Ambil Data Kelas
  const classRef = useMemoFirebase(() => db && assignment ? doc(db, 'classes', assignment.classId) : null, [db, assignment])
  const { data: classroom, loading: loadingC } = useDoc<Classroom>(classRef)

  // Ambil Murid di Kelas Ini
  const studentsQuery = useMemoFirebase(() => {
    if (!db || !classroom?.students?.length) return null
    return query(collection(db, 'applicants'), where('id', 'in', classroom.students))
  }, [db, classroom])
  const { data: students, loading: loadingS } = useCollection<Applicant>(studentsQuery)

  // Ambil Nilai yang Sudah Ada
  const assessmentsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'assessments'), where('assignmentId', '==', assignmentId))
  }, [db, assignmentId])
  const { data: existingAssessments } = useCollection<Assessment>(assessmentsQuery)

  // Local State untuk Form Nilai
  const [grades, setGrades] = useState<Record<string, Partial<Assessment>>>({})

  useEffect(() => {
    if (existingAssessments) {
      const gMap: Record<string, Partial<Assessment>> = {}
      existingAssessments.forEach(a => {
        gMap[a.studentId] = a
      })
      setGrades(gMap)
    }
  }, [existingAssessments])

  const handleGradeChange = (studentId: string, field: keyof Assessment, value: string) => {
    const numValue = Math.min(100, Math.max(0, parseInt(value) || 0))
    setGrades(prev => {
      const current = prev[studentId] || { studentId, assignmentId: assignmentId as string }
      const updated = { ...current, [field]: numValue }
      
      // Hitung Nilai Akhir Otomatis: Absen (10%), Tugas (20%), UTS (30%), UAS (40%)
      const att = (updated.attendance || 0) * 0.1
      const hw = (updated.homework || 0) * 0.2
      const mid = (updated.midExam || 0) * 0.3
      const fin = (updated.finalExam || 0) * 0.4
      updated.finalScore = Math.round(att + hw + mid + fin)
      
      return { ...prev, [studentId]: updated }
    })
  }

  const saveAllGrades = async () => {
    if (!db) return
    setIsSaving(true)
    const batch = writeBatch(db)
    
    try {
      Object.entries(grades).forEach(([studentId, data]) => {
        const docId = `${assignmentId}_${studentId}`
        const ref = doc(db, 'assessments', docId)
        batch.set(ref, {
          ...data,
          studentId,
          assignmentId,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      })
      
      await batch.commit()
      toast({ title: "Nilai Berhasil Disimpan", description: "Seluruh data nilai murid telah diperbarui." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan nilai" })
    } finally {
      setIsSaving(false)
    }
  }

  if (loadingA || loadingC || loadingS) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
          <div>
            <h1 className="text-2xl font-bold">{assignment?.subjectName}</h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest text-primary">Kelas {classroom?.name}</p>
          </div>
        </div>
        <Button onClick={saveAllGrades} disabled={isSaving} className="gap-2 shadow-lg shadow-primary/20">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Nilai
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="border-border/50">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[200px]">Nama Murid</TableHead>
                  <TableHead className="w-[100px] text-center">Kehadiran</TableHead>
                  <TableHead className="w-[100px] text-center">Tugas</TableHead>
                  <TableHead className="w-[100px] text-center">UTS</TableHead>
                  <TableHead className="w-[100px] text-center">UAS</TableHead>
                  <TableHead className="w-[120px] text-center font-bold text-primary">NILAI AKHIR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students?.sort((a,b) => a.fullName.localeCompare(b.fullName)).map((s) => {
                  const sGrade = grades[s.id] || {}
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.fullName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{s.NISN}</div>
                      </TableCell>
                      <TableCell><Input type="number" value={sGrade.attendance || ""} onChange={(e) => handleGradeChange(s.id, 'attendance', e.target.value)} className="text-center font-bold" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.homework || ""} onChange={(e) => handleGradeChange(s.id, 'homework', e.target.value)} className="text-center font-bold" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.midExam || ""} onChange={(e) => handleGradeChange(s.id, 'midExam', e.target.value)} className="text-center font-bold" /></TableCell>
                      <TableCell><Input type="number" value={sGrade.finalExam || ""} onChange={(e) => handleGradeChange(s.id, 'finalExam', e.target.value)} className="text-center font-bold" /></TableCell>
                      <TableCell className="text-center">
                        <Badge variant={ (sGrade.finalScore || 0) >= 75 ? 'default' : 'destructive'} className="w-16 justify-center py-2 text-sm">
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
                <Info className="w-4 h-4 text-primary" /> Aturan Penilaian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[11px] leading-relaxed">
              <div className="flex justify-between border-b pb-1"><span>Kehadiran (Absensi)</span><span className="font-bold text-primary">10%</span></div>
              <div className="flex justify-between border-b pb-1"><span>Tugas / Harian</span><span className="font-bold text-primary">20%</span></div>
              <div className="flex justify-between border-b pb-1"><span>UTS (Tengah Semester)</span><span className="font-bold text-primary">30%</span></div>
              <div className="flex justify-between border-b pb-1"><span>UAS (Akhir Semester)</span><span className="font-bold text-primary">40%</span></div>
              <p className="mt-4 text-muted-foreground italic">* Nilai Akhir dihitung secara otomatis saat Anda mengetik.</p>
              <div className="pt-2">
                <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5 w-full justify-center">KKM: 75</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Ringkasan Kelas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{students?.length || 0} Murid Aktif</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>KKM Terlampaui: {Object.values(grades).filter(g => (g.finalScore || 0) >= 75).length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span>Di bawah KKM: {Object.values(grades).filter(g => (g.finalScore || 0) < 75 && g.studentId).length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
