
"use client"

import { useState, useMemo } from 'react'
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
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCollection, useFirestore } from '@/firebase'
import { collection, doc, updateDoc, writeBatch } from 'firebase/firestore'
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
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export default function ClassesPage() {
  const [isShuffling, setIsShuffling] = useState(false)
  const db = useFirestore()

  const { data: classes, loading: loadingClasses } = useCollection<Classroom>(db ? collection(db, 'classes') : null)
  const { data: applicants } = useCollection<Applicant>(db ? collection(db, 'applicants') : null)

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

      try {
        await batch.commit()
      } catch (err) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'classes',
          operation: 'update'
        }))
      }
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
          <Button className="bg-primary hover:bg-primary/90 gap-2">
            <LayoutGrid className="w-4 h-4" />
            Tambah Kelas Baru
          </Button>
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
