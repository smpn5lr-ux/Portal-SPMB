"use client"

import { useState } from 'react'
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Printer, 
  Shuffle, 
  CheckCircle2, 
  Save,
  RotateCcw,
  LayoutGrid,
  Settings2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockClasses, mockApplicants } from "@/lib/mock-data"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"

export default function ClassesPage() {
  const [isShuffling, setIsShuffling] = useState(false)
  const [shuffledResult, setShuffledResult] = useState<any[]>(mockClasses)

  const handleShuffle = () => {
    setIsShuffling(true)
    setTimeout(() => {
      // Logic for balancing class distribution
      const acceptedStudents = mockApplicants.filter(a => a.admissionStatus === 'accepted')
      const distributedClasses = mockClasses.map((cls, idx) => {
        // Mock distribution
        const perClass = Math.ceil(acceptedStudents.length / mockClasses.length)
        const classStudents = acceptedStudents.slice(idx * perClass, (idx + 1) * perClass)
        return {
          ...cls,
          currentEnrollment: classStudents.length,
          students: classStudents.map(s => s.id)
        }
      })
      setShuffledResult(distributedClasses)
      setIsShuffling(false)
    }, 2000)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Kelas</h1>
          <p className="text-muted-foreground mt-1">Distribusi dan pengacakan rombongan belajar otomatis.</p>
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
                  Sistem akan mendistribusikan siswa yang diterima secara seimbang.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    'Keseimbangan Jenis Kelamin',
                    'Distribusi Nilai Akademik Seimbang',
                    'Penyebaran Asal Sekolah',
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
                  {isShuffling ? 'Proses Mengacak...' : 'Mulai Distribusi'}
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
        {shuffledResult.map((cls) => (
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
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
              <p className="text-muted-foreground mt-2">Menyeimbangkan gender dan asal sekolah pendaftar.</p>
            </div>
          </div>
        </div>
      )}

      {shuffledResult[0].students.length > 0 && !isShuffling && (
        <Card className="border-border/50 border-primary/20 bg-primary/5 animate-in slide-in-from-top-4 duration-500">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Hasil Distribusi Tersedia</h3>
                  <p className="text-sm text-muted-foreground">Preview hasil pengacakan sebelum disimpan permanen ke database.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShuffledResult(mockClasses)} className="gap-2 border-primary/20 text-primary">
                  <RotateCcw className="w-4 h-4" />
                  Acak Ulang
                </Button>
                <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  <Save className="w-4 h-4" />
                  Simpan Hasil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
