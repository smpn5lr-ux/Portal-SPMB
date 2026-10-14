
"use client"

import { useState } from 'react'
import { Plus, UserCheck, Trash2, Loader2, Pencil, BookOpen, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { TeacherAssignment, Staff, Classroom, Subject } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Badge } from "@/components/ui/badge"

export default function TeacherAssignmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null)
  const { toast } = useToast()
  const db = useFirestore()

  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [totalJP, setTotalJP] = useState("2")

  const assignmentsQuery = useMemoFirebase(() => db ? collection(db, 'teacherAssignments') : null, [db])
  const staffQuery = useMemoFirebase(() => db ? collection(db, 'staff') : null, [db])
  const classesQuery = useMemoFirebase(() => db ? collection(db, 'classes') : null, [db])
  const subjectsQuery = useMemoFirebase(() => db ? collection(db, 'subjects') : null, [db])

  const { data: assignments, loading: loadingA } = useCollection<TeacherAssignment>(assignmentsQuery)
  const { data: staff, loading: loadingS } = useCollection<Staff>(staffQuery)
  const { data: classes, loading: loadingC } = useCollection<Classroom>(classesQuery)
  const { data: subjects, loading: loadingSub } = useCollection<Subject>(subjectsQuery)

  const teachers = staff?.filter(s => s.role === 'Guru') || []

  const handleOpenAdd = () => {
    setEditingAssignment(null)
    setSelectedTeacherId("")
    setSelectedClassId("")
    setSelectedSubjectId("")
    setTotalJP("2")
    setIsDialogOpen(true)
  }

  const handleEdit = (a: TeacherAssignment) => {
    setEditingAssignment(a)
    setSelectedTeacherId(a.teacherId)
    setSelectedClassId(a.classId)
    setSelectedSubjectId(a.subjectId)
    setTotalJP(a.totalJP?.toString() || "2")
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!db || !selectedTeacherId || !selectedClassId || !selectedSubjectId) {
      toast({ variant: "destructive", title: "Mohon isi semua data" })
      return
    }
    setSubmitting(true)
    
    const teacher = teachers.find(t => t.id === selectedTeacherId)
    const cls = classes?.find(c => c.id === selectedClassId)
    const subject = subjects?.find(s => s.id === selectedSubjectId)

    const payload = {
      teacherId: selectedTeacherId,
      teacherName: teacher?.fullName,
      classId: selectedClassId,
      className: cls?.name,
      subjectId: selectedSubjectId,
      subjectName: subject?.name,
      totalJP: parseInt(totalJP) || 0
    }

    try {
      if (editingAssignment) {
        await updateDoc(doc(db, 'teacherAssignments', editingAssignment.id), payload)
        toast({ title: "Penugasan Diperbarui" })
      } else {
        await addDoc(collection(db, 'teacherAssignments'), payload)
        toast({ title: "Penugasan Berhasil" })
      }
      setIsDialogOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, 'teacherAssignments', id))
    toast({ title: "Penugasan Dicabut" })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Penugasan Guru</h1>
          <p className="text-muted-foreground">Hubungkan Guru dengan Mapel, Kelas, dan Beban Jam (JP) Dapodik.</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Tambah Penugasan
        </Button>
      </div>

      <Card className="border-border/50 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-primary/5">
            <TableRow>
              <TableHead className="font-bold text-primary">Guru Pengajar</TableHead>
              <TableHead className="font-bold text-primary">Mata Pelajaran</TableHead>
              <TableHead className="font-bold text-primary">Kelas</TableHead>
              <TableHead className="font-bold text-primary text-center">Beban JP</TableHead>
              <TableHead className="text-right font-bold text-primary">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingA ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : assignments?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Belum ada penugasan guru.</TableCell></TableRow>
            ) : assignments?.sort((a,b) => a.teacherName.localeCompare(b.teacherName)).map(a => (
              <TableRow key={a.id} className="hover:bg-muted/10 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-accent" />
                    <span className="font-medium">{a.teacherName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>{a.subjectName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">KELAS {a.className}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">{a.totalJP || 0} JP</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex gap-4">
         <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
         <div className="text-xs text-muted-foreground leading-relaxed">
           <p className="font-bold text-primary mb-1">PANDUAN DAPODIK:</p>
           Input <strong>Total JP</strong> sangat krusial untuk validasi roster. Contoh: Jika mapel Matematika diajarkan 2 kali seminggu dengan durasi masing-masing 2 JP, maka Total JP adalah 4. Sistem Roster akan memberikan peringatan jika plotting di jadwal kurang dari beban jam ini.
         </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Edit Penugasan Guru' : 'Plotting Guru & Beban JP'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Pilih Guru</label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Mata Pelajaran</label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                <SelectContent>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (G-{s.grade})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Rombongan Belajar</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>Kelas {c.name} (G-{c.gradeLevel})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary">Beban Jam Pelajaran (Total JP Per Minggu)</label>
              <Input type="number" min="1" value={totalJP} onChange={e => setTotalJP(e.target.value)} placeholder="Contoh: 4" />
              <p className="text-[10px] text-muted-foreground italic">Target jam yang harus terpenuhi di jadwal mingguan.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingAssignment ? 'Simpan Perubahan' : 'Simpan Penugasan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
