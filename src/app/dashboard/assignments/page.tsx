
"use client"

import { useState } from 'react'
import { Plus, UserCheck, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore'
import { TeacherAssignment, Staff, Classroom, Subject } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

export default function TeacherAssignmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const db = useFirestore()

  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")
  const [selectedSubjectId, setSelectedSubjectId] = useState("")

  const assignmentsQuery = useMemoFirebase(() => db ? collection(db, 'teacherAssignments') : null, [db])
  const staffQuery = useMemoFirebase(() => db ? collection(db, 'staff') : null, [db])
  const classesQuery = useMemoFirebase(() => db ? collection(db, 'classes') : null, [db])
  const subjectsQuery = useMemoFirebase(() => db ? collection(db, 'subjects') : null, [db])

  const { data: assignments, loading: loadingA } = useCollection<TeacherAssignment>(assignmentsQuery)
  const { data: staff, loading: loadingS } = useCollection<Staff>(staffQuery)
  const { data: classes, loading: loadingC } = useCollection<Classroom>(classesQuery)
  const { data: subjects, loading: loadingSub } = useCollection<Subject>(subjectsQuery)

  const teachers = staff?.filter(s => s.role === 'Guru') || []

  const handleAssign = async () => {
    if (!db || !selectedTeacherId || !selectedClassId || !selectedSubjectId) return
    setSubmitting(true)
    
    const teacher = teachers.find(t => t.id === selectedTeacherId)
    const cls = classes?.find(c => c.id === selectedClassId)
    const subject = subjects?.find(s => s.id === selectedSubjectId)

    try {
      await addDoc(collection(db, 'teacherAssignments'), {
        teacherId: selectedTeacherId,
        teacherName: teacher?.fullName,
        classId: selectedClassId,
        className: cls?.name,
        subjectId: selectedSubjectId,
        subjectName: subject?.name
      })
      toast({ title: "Penugasan Berhasil" })
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Penugasan Guru</h1>
          <p className="text-muted-foreground">Atur siapa yang mengajar mapel apa di kelas mana.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Plotting Guru
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guru Pengajar</TableHead>
              <TableHead>Mata Pelajaran</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingA ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : assignments?.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.teacherName}</TableCell>
                <TableCell>{a.subjectName}</TableCell>
                <TableCell>Kelas {a.className}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Plotting Guru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Guru</label>
              <Select onValueChange={setSelectedTeacherId}>
                <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Mata Pelajaran</label>
              <Select onValueChange={setSelectedSubjectId}>
                <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                <SelectContent>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (Gr-{s.grade})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Rombel / Kelas</label>
              <Select onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>Kelas {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAssign} disabled={submitting}>Simpan Penugasan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
