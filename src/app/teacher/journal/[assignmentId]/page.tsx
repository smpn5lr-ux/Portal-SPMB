
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
  AlertCircle,
  RefreshCw,
  Download
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
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc, useAuth } from "@/firebase"
import { collection, query, where, doc, writeBatch, deleteDoc } from "firebase/firestore"
import { TeacherAssignment, Applicant, Classroom, Journal } from "@/lib/types"
import { useToast } from '@/hooks/use-toast'

export default function TeachingJournalPage() {
  const { assignmentId } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const db = useFirestore()
  const auth = useAuth()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  const activeSemester = parseInt(searchParams.get('semester') || "1")

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null
    return doc(db, 'settings', 'system')
  }, [db, user])
  
  const { data: config } = useDoc<any>(settingsRef)

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
    if (!db || !assignmentId || !user) return null
    return query(
      collection(db, 'journals'), 
      where('assignmentId', '==', assignmentId)
    )
  }, [db, assignmentId, user])
  
  const { data: rawJournals, loading: loadingJ } = useCollection<Journal>(journalQuery)

  const journals = useMemo(() => {
    if (!rawJournals) return []
    return rawJournals
      .filter(j => j.semester === activeSemester)
      .sort((a, b) => (a.meetingNumber || 0) - (b.meetingNumber || 0))
  }, [rawJournals, activeSemester])

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

  const handleRefreshSession = async () => {
    setIsRefreshing(true)
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true)
        toast({ title: "Sesi Disegarkan" })
        window.location.reload()
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal" })
    } finally {
      setIsRefreshing(false)
    }
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
      const journalRef = doc(collection(db, 'journals'))
      batch.set(journalRef, journalData)
      
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
      toast({ title: "Berhasil", description: "Jurnal telah disimpan." })
      setIsAddOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!assignment || !journals.length) return
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF()
      
      const dinasName = config?.dinasName || "DINAS PENDIDIKAN"
      const schoolName = config?.schoolName || "SIS TERPADU"
      
      doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(67, 97, 238)
      doc.text(dinasName.toUpperCase(), 105, 15, { align: "center" })
      doc.text(schoolName.toUpperCase(), 105, 22, { align: "center" })
      doc.setDrawColor(67, 97, 238).setLineWidth(0.5).line(14, 26, 196, 26)

      doc.setFontSize(14).setTextColor(0).text(`JURNAL MENGAJAR - SEMESTER ${activeSemester}`, 14, 38)
      doc.setFontSize(10).setTextColor(100)
      doc.text(`Mata Pelajaran: ${assignment.subjectName}`, 14, 45)
      doc.text(`Kelas: ${assignment.className} | Guru: ${user?.displayName || '-'}`, 14, 51)
      
      const tableData = journals.map((j) => {
        const absentNames = j.absentStudents.map(id => students.find(s => s.id === id)?.fullName || 'ID:'+id).join(", ")
        return [
          j.meetingNumber,
          new Date(j.date).toLocaleDateString('id-ID'),
          j.material || '-',
          absentNames || 'Hadir Semua'
        ]
      })

      autoTable(doc, {
        head: [['No', 'Tanggal', 'Materi Pembelajaran', 'Siswa Alfa']],
        body: tableData,
        startY: 58,
        theme: 'grid',
        headStyles: { fillColor: [67, 97, 238], textColor: [255, 255, 255] },
        columnStyles: { 2: { cellWidth: 80 }, 3: { cellWidth: 50 } }
      })

      doc.save(`Jurnal_${assignment.subjectName}_Kelas_${assignment.className}_Smt${activeSemester}.pdf`)
      toast({ title: "Berhasil Mengunduh", description: "Jurnal telah disimpan sebagai PDF." })
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal ekspor PDF" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteJournal = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, 'journals', id))
    toast({ title: "Dihapus" })
  }

  if (userLoading || loadingA) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
      <p className="text-sm text-muted-foreground animate-pulse">Menghubungkan ke sistem...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full border"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Jurnal: {assignment?.subjectName}</h1>
              <Badge variant="outline">Sem {activeSemester}</Badge>
            </div>
            <p className="text-muted-foreground text-sm font-bold text-primary">Kelas {assignment?.className}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handleDownloadPDF} disabled={isExporting} className="gap-2 text-xs h-9">
              {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Cetak Jurnal
           </Button>
           <Button variant="outline" onClick={handleRefreshSession} className="gap-2 text-xs h-9">
              <RefreshCw className="w-3 h-3" /> Refresh Izin
           </Button>
           <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-lg shadow-primary/20 h-9">
             <Plus className="w-4 h-4" /> Tambah Pertemuan
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loadingJ && !journals.length ? (
          <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></div>
        ) : journals.length === 0 ? (
          <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center text-muted-foreground">
            <BookOpen className="w-12 h-12 opacity-20 mb-4" />
            <p>Belum ada catatan jurnal untuk semester ini.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {journals.map((j) => (
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
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Materi:</Label>
                    <p className="text-sm mt-1">{j.material || "-"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/20">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground w-full">Absensi:</div>
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
          <DialogHeader><DialogTitle>Input Jurnal & Absensi</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Pertemuan Ke-</Label><Input type="number" value={newJournal.meetingNumber} onChange={e => setNewJournal({...newJournal, meetingNumber: parseInt(e.target.value)})} /></div>
              <div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={newJournal.date} onChange={e => setNewJournal({...newJournal, date: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Materi</Label><Textarea placeholder="Bahasan hari ini..." value={newJournal.material} onChange={e => setNewJournal({...newJournal, material: e.target.value})} /></div>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><Label className="font-bold">Kehadiran & Nilai Tugas</Label><div className="flex items-center gap-2"><Label className="text-xs">Ada Tugas?</Label><Switch checked={newJournal.hasTask} onCheckedChange={v => setNewJournal({...newJournal, hasTask: v})} /></div></div>
              {newJournal.hasTask && (
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 mb-2">
                  <Select value={newJournal.taskType!} onValueChange={v => setNewJournal({...newJournal, taskType: v as any})}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task1">Tugas 1</SelectItem>
                      <SelectItem value="task2">Tugas 2</SelectItem>
                      <SelectItem value="task3">Tugas 3</SelectItem>
                      <SelectItem value="groupTask">Tugas Kelompok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50"><TableRow><TableHead className="w-[80px] text-center">Alfa?</TableHead><TableHead>Siswa</TableHead>{newJournal.hasTask && <TableHead className="w-24 text-center">Nilai</TableHead>}</TableRow></TableHeader>
                  <TableBody>
                    {students.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-center"><Checkbox checked={newJournal.absentStudents?.includes(s.id)} onCheckedChange={() => handleToggleAbsent(s.id)} /></TableCell>
                        <TableCell className="text-sm font-medium">{s.fullName}</TableCell>
                        {newJournal.hasTask && <TableCell><Input type="number" className="h-8 text-center" placeholder="0" disabled={newJournal.absentStudents?.includes(s.id)} value={newJournal.taskScores?.[s.id] || ""} onChange={e => handleScoreChange(s.id, e.target.value)} /></TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveJournal} disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan Jurnal'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
