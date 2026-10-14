
"use client"

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus,
  Calendar,
  BookOpen,
  Users,
  CheckCircle2,
  Trash2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase"
import { collection, query, where, doc, writeBatch, addDoc, deleteDoc, orderBy } from "firebase/firestore"
import { TeacherAssignment, Applicant, Classroom, Journal } from "@/lib/types"
import { useToast } from '@/hooks/use-toast'

export default function TeachingJournalPage() {
  const { assignmentId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const db = useFirestore()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const activeSemester = parseInt(searchParams.get('semester') || "1")

  const assignmentRef = useMemoFirebase(() => {
    if (!db || !assignmentId || !user) return null
    return doc(db, 'teacherAssignments', assignmentId as string)
  }, [db, assignmentId, user])
  
  const { data: assignment, loading: loadingA } = useDoc<TeacherAssignment>(assignmentRef)

  const classRef = useMemoFirebase(() => {
    if (!db || !assignment || !user) return null
    return doc(db, 'classes', assignment.classId)
  }, [db, assignment, user])
  
  const { data: classroom } = useDoc<Classroom>(classRef)

  const studentsQuery = useMemoFirebase(() => {
    if (!db || !user) return null 
    return query(collection(db, 'applicants'), where('admissionStatus', '==', 'accepted'))
  }, [db, user])
  const { data: allAcceptedStudents } = useCollection<Applicant>(studentsQuery)

  const students = useMemo(() => {
    if (!allAcceptedStudents || !classroom?.students) return []
    return allAcceptedStudents
      .filter(s => classroom.students.includes(s.id) && !s.isDeleted)
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""))
  }, [allAcceptedStudents, classroom])

  const journalQuery = useMemoFirebase(() => {
    // PROTEKSI: Jangan jalankan query jika user belum terdeteksi
    if (!db || !assignmentId || !user || !user.uid) return null
    return query(
      collection(db, 'journals'), 
      where('assignmentId', '==', assignmentId),
      where('semester', '==', activeSemester),
      orderBy('meetingNumber', 'asc')
    )
  }, [db, assignmentId, activeSemester, user])
  const { data: journals, loading: loadingJ } = useCollection<Journal>(journalQuery)

  // State untuk Journal Baru
  const [newJournal, setNewJournal] = useState<Partial<Journal>>({
    meetingNumber: 1,
    date: new Date().toISOString().split('T')[0],
    material: "",
    absentStudents: [],
    hasTask: false,
    taskType: 'task1',
    taskScores: {}
  })

  useEffect(() => {
    if (journals && journals.length > 0) {
      setNewJournal(prev => ({ ...prev, meetingNumber: journals.length + 1 }))
    }
  }, [journals])

  const handleToggleAbsent = (studentId: string) => {
    setNewJournal(prev => {
      const current = prev.absentStudents || []
      const updated = current.includes(studentId) 
        ? current.filter(id => id !== studentId)
        : [...current, studentId]
      return { ...prev, absentStudents: updated }
    })
  }

  const handleScoreChange = (studentId: string, score: string) => {
    const val = parseInt(score) || 0
    setNewJournal(prev => ({
      ...prev,
      taskScores: { ...prev.taskScores, [studentId]: val }
    }))
  }

  const saveJournal = async () => {
    if (!db || !assignmentId || !user) return
    setSubmitting(true)
    
    try {
      const journalData = {
        ...newJournal,
        assignmentId,
        semester: activeSemester,
        createdAt: new Date().toISOString()
      }
      
      const batch = writeBatch(db)
      
      // 1. Simpan Jurnal
      const journalRef = doc(collection(db, 'journals'))
      batch.set(journalRef, journalData)
      
      // 2. Jika ada tugas, sinkronkan ke Assessment
      if (newJournal.hasTask && newJournal.taskType && newJournal.taskScores) {
        Object.entries(newJournal.taskScores).forEach(([sId, score]) => {
          const assessmentId = `${assignmentId}_${sId}_sem${activeSemester}`
          const aRef = doc(db, 'assessments', assessmentId)
          batch.set(aRef, {
            studentId: sId,
            assignmentId,
            semester: activeSemester,
            [newJournal.taskType!]: score,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        })
      }
      
      // 3. Update Kehadiran di Assessment secara otomatis
      const allJournals = [...(journals || []), journalData as Journal]
      const totalMeetings = allJournals.length
      
      students.forEach(s => {
        const absences = allJournals.filter(j => j.absentStudents.includes(s.id)).length
        const attendancePercent = Math.round(((totalMeetings - absences) / totalMeetings) * 100)
        
        const assessmentId = `${assignmentId}_${s.id}_sem${activeSemester}`
        const aRef = doc(db, 'assessments', assessmentId)
        batch.set(aRef, {
          studentId: s.id,
          assignmentId,
          semester: activeSemester,
          attendance: attendancePercent,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      })

      await batch.commit()
      toast({ title: "Jurnal Berhasil Simpan", description: `Pertemuan ke-${newJournal.meetingNumber} telah dicatat.` })
      setIsAddOpen(false)
      setNewJournal({
        meetingNumber: (journals?.length || 0) + 2,
        date: new Date().toISOString().split('T')[0],
        material: "",
        absentStudents: [],
        hasTask: false,
        taskType: 'task1',
        taskScores: {}
      })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan jurnal" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteJournal = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, 'journals', id))
    toast({ title: "Jurnal Dihapus" })
  }

  if (userLoading || loadingA || (loadingJ && !journals)) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
      <p className="text-sm text-muted-foreground animate-pulse">Memuat jurnal mengajar...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full border"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Jurnal Mengajar: {assignment?.subjectName}</h1>
              <Badge variant="outline">Sem {activeSemester}</Badge>
            </div>
            <p className="text-muted-foreground text-sm font-bold text-primary">Kelas {assignment?.className}</p>
          </div>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Catat Pertemuan Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {journals?.length === 0 ? (
          <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center text-muted-foreground">
            <BookOpen className="w-12 h-12 opacity-20 mb-4" />
            <p>Belum ada catatan pertemuan untuk semester ini.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {journals?.map((j) => (
              <Card key={j.id} className="border-border/50 overflow-hidden bg-card/30">
                <CardHeader className="bg-muted/10 p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">
                        {j.meetingNumber}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">Pertemuan Ke-{j.meetingNumber}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(j.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {j.hasTask && <Badge className="bg-accent text-white uppercase text-[10px]">{j.taskType}</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteJournal(j.id)} className="text-destructive h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Materi Pembelajaran:</Label>
                    <p className="text-sm mt-1">{j.material || "Tidak ada rincian materi."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/20">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground w-full">Absensi (Siswa Tidak Hadir):</div>
                    {j.absentStudents.length === 0 ? (
                      <Badge variant="outline" className="text-green-500 bg-green-500/5">Hadir Semua</Badge>
                    ) : (
                      j.absentStudents.map(id => {
                        const s = students.find(st => st.id === id)
                        return <Badge key={id} variant="destructive" className="bg-destructive/10 text-destructive border-none">{s?.fullName}</Badge>
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Catat Jurnal & Absensi
            </DialogTitle>
            <DialogDescription>Input materi dan kehadiran untuk Pertemuan ke-{newJournal.meetingNumber}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pertemuan Ke-</Label>
                <Input type="number" value={newJournal.meetingNumber} onChange={e => setNewJournal({...newJournal, meetingNumber: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input type="date" value={newJournal.date} onChange={e => setNewJournal({...newJournal, date: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ringkasan Materi</Label>
              <Textarea placeholder="Tuliskan pokok bahasan hari ini..." value={newJournal.material} onChange={e => setNewJournal({...newJournal, material: e.target.value})} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Daftar Hadir & Nilai Tugas
                </Label>
                <div className="flex items-center gap-2">
                   <Label className="text-xs">Ada Tugas?</Label>
                   <Switch checked={newJournal.hasTask} onCheckedChange={v => setNewJournal({...newJournal, hasTask: v})} />
                </div>
              </div>

              {newJournal.hasTask && (
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 mb-2">
                  <Label className="text-xs font-bold mb-2 block">Pilih Slot Tugas:</Label>
                  <Select value={newJournal.taskType!} onValueChange={v => setNewJournal({...newJournal, taskType: v as any})}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task1">Tugas 1 (Individu)</SelectItem>
                      <SelectItem value="task2">Tugas 2 (Individu)</SelectItem>
                      <SelectItem value="task3">Tugas 3 (Individu)</SelectItem>
                      <SelectItem value="groupTask">Tugas Kelompok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12 text-center">Absen</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      {newJournal.hasTask && <TableHead className="w-24 text-center">Nilai</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-center">
                          <Checkbox checked={newJournal.absentStudents?.includes(s.id)} onCheckedChange={() => handleToggleAbsent(s.id)} />
                        </TableCell>
                        <TableCell className="text-sm font-medium">{s.fullName}</TableCell>
                        {newJournal.hasTask && (
                          <TableCell>
                            <Input 
                              type="number" 
                              className="h-8 text-center" 
                              placeholder="0" 
                              disabled={newJournal.absentStudents?.includes(s.id)}
                              value={newJournal.taskScores?.[s.id] || ""}
                              onChange={e => handleScoreChange(s.id, e.target.value)}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={saveJournal} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Jurnal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
