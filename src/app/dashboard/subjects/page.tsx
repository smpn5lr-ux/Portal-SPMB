
"use client"

import { useState } from 'react'
import { Plus, BookOpen, Trash2, Loader2, Pencil } from "lucide-react"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, query, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { Subject } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

const subjectSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  code: z.string().min(2, "Kode minimal 2 karakter"),
  grade: z.string().optional(),
})

export default function SubjectsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const db = useFirestore()

  const subjectsQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'subjects')
  }, [db])

  const { data: subjects, loading } = useCollection<Subject>(subjectsQuery)

  const form = useForm<z.infer<typeof subjectSchema>>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", code: "", grade: "7" },
  })

  const onSubmit = async (values: z.infer<typeof subjectSchema>) => {
    if (!db || submitting) return
    setSubmitting(true)
    const payload = { ...values, grade: parseInt(values.grade || "7") }
    try {
      if (editingSubject) {
        await updateDoc(doc(db, 'subjects', editingSubject.id), payload)
        toast({ title: "Mata Pelajaran Diperbarui" })
      } else {
        await addDoc(collection(db, 'subjects'), payload)
        toast({ title: "Mata Pelajaran Ditambahkan" })
      }
      setIsDialogOpen(false)
      setEditingSubject(null)
      form.reset()
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, 'subjects', id))
    toast({ title: "Mata Pelajaran Dihapus" })
  }

  const handleEdit = (sub: Subject) => {
    setEditingSubject(sub)
    form.reset({ name: sub.name, code: sub.code, grade: sub.grade.toString() })
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold">Kurikulum & Mapel</h1>
          <p className="text-muted-foreground">Kelola daftar mata pelajaran yang diajarkan.</p>
        </div>
        <Button onClick={() => { setEditingSubject(null); form.reset(); setIsDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Mapel
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Mata Pelajaran</TableHead>
              <TableHead>Tingkat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : subjects?.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-mono">{s.code}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>Kelas {s.grade}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Mapel' : 'Tambah Mapel Baru'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Kode Mapel</FormLabel><FormControl><Input placeholder="MTK-7" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nama Mapel</FormLabel><FormControl><Input placeholder="Matematika" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="grade" render={({ field }) => (
                <FormItem><FormLabel>Tingkat Kelas</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={submitting}>Simpan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
