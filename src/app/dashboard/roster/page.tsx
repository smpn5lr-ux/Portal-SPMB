
"use client"

import { useState, useMemo } from 'react'
import { 
  CalendarClock, 
  Plus, 
  Settings2, 
  Save, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  Clock, 
  Users, 
  BookOpen,
  History,
  CheckCircle2,
  XCircle,
  Timer
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { collection, query, doc, setDoc, addDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { RosterEntry, Staff, Classroom, Subject, TeacherAssignment } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { addMinutes, format, parse } from 'date-fns'

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const MAX_PERIODS = 10

export default function RosterManagementPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("builder")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // State for new entry
  const [newEntry, setNewEntry] = useState<Partial<RosterEntry>>({
    day: "Senin",
    period: 1,
    teacherId: "",
    classId: "",
    subjectId: ""
  })

  // Queries
  const rosterQuery = useMemoFirebase(() => db ? collection(db, 'rosterEntries') : null, [db])
  const staffQuery = useMemoFirebase(() => db ? collection(db, 'staff') : null, [db])
  const classesQuery = useMemoFirebase(() => db ? collection(db, 'classes') : null, [db])
  const subjectsQuery = useMemoFirebase(() => db ? collection(db, 'subjects') : null, [db])
  const configRef = useMemoFirebase(() => db ? doc(db, 'settings', 'roster') : null, [db])

  const { data: rosterEntries, loading: loadingR } = useCollection<RosterEntry>(rosterQuery)
  const { data: staff } = useCollection<Staff>(staffQuery)
  const { data: classes } = useCollection<Classroom>(classesQuery)
  const { data: subjects } = useCollection<Subject>(subjectsQuery)
  const { data: rosterConfig, loading: loadingC } = useDoc<any>(configRef)

  const teachers = staff?.filter(s => s.role === 'Guru') || []

  // Roster Config Defaults
  const config = rosterConfig || {
    entryTime: "07:00",
    jpDuration: 40,
    breakTimes: [
      { periodAfter: 4, duration: 15 },
      { periodAfter: 8, duration: 15 }
    ]
  }

  const getTimeForPeriod = (period: number) => {
    let current = parse(config.entryTime, 'HH:mm', new Date())
    for (let i = 1; i < period; i++) {
      current = addMinutes(current, config.jpDuration)
      const isBreak = config.breakTimes.find((b: any) => b.periodAfter === i)
      if (isBreak) current = addMinutes(current, isBreak.duration)
    }
    const end = addMinutes(current, config.jpDuration)
    return `${format(current, 'HH:mm')} - ${format(end, 'HH:mm')}`
  }

  const handleSaveConfig = async (e: any) => {
    e.preventDefault()
    if (!configRef) return
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const newConfig = {
      entryTime: formData.get('entryTime'),
      jpDuration: parseInt(formData.get('jpDuration') as string),
      breakTimes: config.breakTimes // Keep breaks for now
    }
    await setDoc(configRef, newConfig, { merge: true })
    toast({ title: "Pengaturan Waktu Disimpan" })
    setIsSaving(false)
  }

  const [isSaving, setIsSaving] = useState(false)

  const handleAddEntry = async () => {
    if (!db || !newEntry.day || !newEntry.period || !newEntry.teacherId || !newEntry.classId || !newEntry.subjectId) {
      toast({ variant: "destructive", title: "Data Belum Lengkap" })
      return
    }

    // ANTI-TABRAK LOGIC
    const teacherConflict = rosterEntries?.find(e => 
      e.day === newEntry.day && 
      e.period === newEntry.period && 
      e.teacherId === newEntry.teacherId
    )

    const classConflict = rosterEntries?.find(e => 
      e.day === newEntry.day && 
      e.period === newEntry.period && 
      e.classId === newEntry.classId
    )

    if (teacherConflict) {
      toast({ 
        variant: "destructive", 
        title: "Bentrokan Jadwal Guru", 
        description: `Guru ${teacherConflict.teacherName} sudah mengajar di kelas ${teacherConflict.className} pada jam ini.` 
      })
      return
    }

    if (classConflict) {
      toast({ 
        variant: "destructive", 
        title: "Bentrokan Ruang Kelas", 
        description: `Kelas ${classConflict.className} sedang digunakan untuk Mapel ${classConflict.subjectName}.` 
      })
      return
    }

    setSubmitting(true)
    const t = teachers.find(t => t.id === newEntry.teacherId)
    const c = classes?.find(c => c.id === newEntry.classId)
    const s = subjects?.find(s => s.id === newEntry.subjectId)

    try {
      await addDoc(collection(db, 'rosterEntries'), {
        ...newEntry,
        teacherName: t?.fullName,
        className: c?.name,
        subjectName: s?.name,
        createdAt: new Date().toISOString()
      })
      toast({ title: "Jadwal Ditambahkan" })
      setIsAddOpen(false)
    } catch (e) {
      toast({ variant: "destructive", title: "Gagal menyimpan" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!db) return
    await deleteDoc(doc(db, 'rosterEntries', id))
    toast({ title: "Slot Jadwal Dikosongkan" })
  }

  const getEntry = (day: string, period: number, classId: string) => {
    return rosterEntries?.find(e => e.day === day && e.period === period && e.classId === classId)
  }

  if (loadingR || loadingC) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Manajemen Roster</h1>
          <p className="text-muted-foreground mt-1">Desain jadwal mengajar harian dan cegah bentrokan jam pelajaran.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Plot Jadwal
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builder" onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 border border-border/50">
          <TabsTrigger value="builder" className="gap-2"><CalendarClock className="w-4 h-4" /> Jadwal Mingguan</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings2 className="w-4 h-4" /> Pengaturan Waktu</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6 mt-6">
          {classes?.map(cls => (
            <Card key={cls.id} className="border-border/50 overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-3 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Jadwal Kelas {cls.name}</CardTitle>
                  </div>
                  <Badge variant="outline">Tingkat {cls.gradeLevel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow>
                      <TableHead className="w-32 border-r bg-muted/20">Waktu / Jam</TableHead>
                      {DAYS.map(day => <TableHead key={day} className="text-center min-w-[150px]">{day}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: MAX_PERIODS }).map((_, i) => {
                      const period = i + 1
                      return (
                        <TableRow key={period}>
                          <TableCell className="border-r font-medium text-xs bg-muted/10">
                             <div className="flex flex-col">
                               <span className="text-primary font-bold">Jam ke-{period}</span>
                               <span className="text-[10px] text-muted-foreground">{getTimeForPeriod(period)}</span>
                             </div>
                          </TableCell>
                          {DAYS.map(day => {
                            const entry = getEntry(day, period, cls.id)
                            return (
                              <TableCell key={day} className="p-2 border-r last:border-r-0 h-24 relative group">
                                {entry ? (
                                  <div className="h-full bg-primary/5 border border-primary/20 rounded-md p-2 flex flex-col justify-between hover:bg-primary/10 transition-colors">
                                    <div>
                                      <div className="font-bold text-[10px] text-primary truncate uppercase">{entry.subjectName}</div>
                                      <div className="text-[10px] text-muted-foreground mt-1 truncate">{entry.teacherName}</div>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                                      onClick={() => handleDeleteEntry(entry.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="h-full flex items-center justify-center opacity-20 group-hover:opacity-100 transition-opacity">
                                     <Badge variant="outline" className="text-[10px] cursor-pointer" onClick={() => {
                                       setNewEntry({ ...newEntry, day, period, classId: cls.id })
                                       setIsAddOpen(true)
                                     }}>Kosong</Badge>
                                  </div>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Jam Operasional Sekolah</CardTitle>
              <CardDescription>Atur jam masuk dan durasi setiap Jam Pelajaran (JP).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveConfig} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> Jam Masuk (Jam ke-1)
                    </label>
                    <Input name="entryTime" type="time" defaultValue={config.entryTime} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2">
                      <Timer className="w-4 h-4 text-primary" /> Durasi per JP (Menit)
                    </label>
                    <Input name="jpDuration" type="number" defaultValue={config.jpDuration} />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Logika Istirahat Otomatis</h3>
                     <Badge variant="secondary">Fitur Sistem</Badge>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                    {config.breakTimes.map((b: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 text-sm">
                         <CheckCircle2 className="w-4 h-4 text-green-500" />
                         <span>Istirahat setelah <strong>Jam ke-{b.periodAfter}</strong> selama <strong>{b.duration} menit</strong>.</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Pengaturan
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Plotting Jadwal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Plotting Jadwal Pelajaran</DialogTitle>
            <DialogDescription>Masukkan mata pelajaran ke dalam slot waktu yang dipilih.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Hari</label>
                  <Select value={newEntry.day} onValueChange={v => setNewEntry({...newEntry, day: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold uppercase">Jam Ke-</label>
                  <Select value={newEntry.period?.toString()} onValueChange={v => setNewEntry({...newEntry, period: parseInt(v)})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({length: MAX_PERIODS}).map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>Jam ke-{i+1}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Ruang Kelas</label>
              <Select value={newEntry.classId} onValueChange={v => setNewEntry({...newEntry, classId: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih Rombel" /></SelectTrigger>
                <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>Kelas {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Mata Pelajaran</label>
              <Select value={newEntry.subjectId} onValueChange={v => setNewEntry({...newEntry, subjectId: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                <SelectContent>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} (G-{s.grade})</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase">Guru Pengajar</label>
              <Select value={newEntry.teacherId} onValueChange={v => setNewEntry({...newEntry, teacherId: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
                <SelectContent>{teachers?.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 flex gap-3">
               <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
               <p className="text-[10px] text-amber-600 leading-relaxed italic">Sistem akan otomatis mendeteksi bentrokan jadwal guru dan ruang kelas setelah Anda mengklik simpan.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddEntry} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Plotting Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
