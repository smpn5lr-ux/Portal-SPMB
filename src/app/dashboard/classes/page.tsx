
"use client"

import { useState } from 'react'
import { 
  Users, 
  Trash2, 
  Printer, 
  Shuffle, 
  CheckCircle2, 
  Save,
  RotateCcw,
  LayoutGrid,
  Settings2,
  Loader2,
  Plus
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, doc, updateDoc, writeBatch, addDoc } from 'firebase/firestore'
import { Applicant, Classroom } from '@/lib/types'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { useToast } from '@/hooks/use-toast'

const classFormSchema = z.object({
  name: z.string().min(1, "Nama kelas harus diisi"),
  gradeLevel: z.string().min(1, "Tingkat harus diisi"),
  homeroomTeacher: z.string().min(2, "Nama wali kelas harus diisi"),
  capacity: z.string().min(1, "Kapasitas harus diisi"),
})

export default function ClassesPage() {
  const [isShuffling, setIsShuffling] = useState(false)
  const [isAddClassOpen, setIsAddClassOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const db = useFirestore()

  const classesQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'classes')
  }, [db])

  const applicantsQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'applicants')
  }, [db])

  const { data: classes, loading: loadingClasses } = useCollection<Classroom>(classesQuery)
  const { data: applicants } = useCollection<Applicant>(applicantsQuery)

  const form = useForm<z.infer<typeof classFormSchema>>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      gradeLevel: "7",
      homeroomTeacher: "",
      capacity: "32",
    },
  })

  const onAddClassSubmit = (values: z.infer<typeof classFormSchema>) => {
    if (!db || submitting) return
    setSubmitting(true)

    const newClass = {
      name: values.name,
      gradeLevel: parseInt(values.gradeLevel),
      homeroomTeacher: values.homeroomTeacher,
      capacity: parseInt(values.capacity),
      currentEnrollment: 0,
      students: []
    }

    addDoc(collection(db, 'classes'), newClass)
      .then(() => {
        setIsAddClassOpen(false)
        form.reset()
        toast({
          title: "Kelas Berhasil Dibuat",
          description: `Kelas ${values.name} telah ditambahkan ke sistem.`,
        })
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'classes',
          operation: 'create',
          requestResourceData: newClass
        }))
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handleShuffle = () => {
    if (!applicants || !classes || !db) return
    setIsShuffling(true)
    
    setTimeout(async () => {
      const acceptedStudents = applicants.filter(a => a.admissionStatus === 'accepted')
      const batch = writeBatch(db)
      
      classes.forEach((cls, idx) => {
        const perClass = Math.ceil(acceptedStudents.length / classes.length)
        const classStudents = acceptedStudents.slice(idx * perClass, (idx + 1) * perClass)
        const studentIds = classStudents.map(s => s.id)
        
        const classRef = doc(db, 'classes', cls.id)
        batch.update(classRef, {
          currentEnrollment: studentIds.length,
          students: studentIds
        })
      })

      batch.commit().catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'classes',
          operation: 'update'
        }))
      })
      setIsShuffling(false)
    }, 2000)
  }

  if (loadingClasses) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Kelas</h1>
          <p className="text-muted-foreground mt-1">Distribusi rombongan belajar otomatis menggunakan data real-time.</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Shuffle className="w-4 h-4" />
                Acak Kelas Otomatis
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-border/50 bg-card">
              <DialogHeader>
                <DialogTitle className="font-headline">Pengaturan Distribusi Otomatis</DialogTitle>
                <DialogDescription>
                  Sistem akan mendistribusikan siswa yang diterima secara seimbang ke seluruh rombel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    'Keseimbangan Jenis Kelamin',
                    'Distribusi Nilai Akademik Seimbang',
                    'Kapasitas Maksimal Kelas'
                  ].map((pref) => (
                    <div key={pref} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                      <span className="text-sm font-medium">{pref}</span>
                      <div className="w-10 h-5 bg-primary rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Batal</Button>
                <Button onClick={handleShuffle} disabled={isShuffling} className="bg-primary hover:bg-primary/90">
                  {isShuffling ? 'Proses...' : 'Mulai Distribusi'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <Plus className="w-4 h-4" />
                Tambah Kelas Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-border/50 bg-card">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Buat Rombel Baru</DialogTitle>
                <DialogDescription>
                  Tambahkan kelompok belajar baru untuk tingkat yang tersedia.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddClassSubmit)} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Kelas</FormLabel>
                          <FormControl>
                            <Input placeholder="Contoh: 7-D" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gradeLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tingkat (Grade)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="homeroomTeacher"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wali Kelas</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama Guru" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kapasitas Siswa</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddClassOpen(false)}>Batal</Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Kelas'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {classes?.map((cls) => (
          <Card key={cls.id} className="border-border/50 hover:border-primary/30 transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="font-headline text-2xl">Kelas {cls.name}</CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">Grade {cls.gradeLevel}</Badge>
              </div>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Users className="w-3 h-3" />
                {cls.currentEnrollment} / {cls.capacity} Siswa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-1000" 
                    style={{ width: `${(cls.currentEnrollment / cls.capacity) * 100}%` }}
                  ></div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Wali Kelas</p>
                  <p className="text-sm font-medium mt-1">{cls.homeroomTeacher}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1">
                    <Printer className="w-3 h-3" /> Daftar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1">
                    <Settings2 className="w-3 h-3" /> Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {classes?.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
             <LayoutGrid className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
             <p className="text-muted-foreground">Belum ada kelas yang terdaftar. Silakan tambah kelas baru.</p>
          </div>
        )}
      </div>

      {isShuffling && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <Shuffle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-headline font-bold">Mengacak Distribusi Kelas...</h2>
              <p className="text-muted-foreground mt-2">Menyeimbangkan data siswa yang diterima di database.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
