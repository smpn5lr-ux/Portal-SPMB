
"use client"

import * as React from "react"
import { 
  GraduationCap,
  LogOut,
  Loader2,
  Menu,
  BookCheck,
  LayoutDashboard,
  UserCircle,
  CalendarDays,
  ChevronRight,
  Download,
  FileSpreadsheet,
  BookOpen,
  Users
} from "lucide-react"
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarInset, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc, collection, query, where, getDocs } from "firebase/firestore"
import { Staff, TeacherAssignment, Journal, Assessment, Applicant, Classroom } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from 'xlsx'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const db = useFirestore()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'system') : null, [db])
  const { data: config } = useDoc<any>(settingsRef)

  const staffQuery = useMemoFirebase(() => {
    if (!db || !user?.email) return null
    return query(collection(db, 'staff'), where('email', '==', user.email))
  }, [db, user])

  const { data: staffData, loading: staffLoading } = useCollection<Staff>(staffQuery)

  const selectedSemester = searchParams.get('semester') || config?.activeSemester?.toString() || "1"
  const teacherId = staffData?.[0]?.id

  React.useEffect(() => {
    if (!userLoading && !user) router.push('/login')
    if (!staffLoading && staffData && staffData.length > 0) {
      if (staffData[0].role !== 'Guru') router.push('/dashboard')
    }
  }, [user, userLoading, staffLoading, staffData, router])

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  // LOGIKA UNDUH
  const fetchAllTeacherData = async () => {
    if (!db || !teacherId) return null
    
    const assignmentsSnap = await getDocs(query(collection(db, 'teacherAssignments'), where('teacherId', '==', teacherId)))
    const assignments = assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherAssignment))
    
    const assignmentIds = assignments.map(a => a.id)
    if (assignmentIds.length === 0) return { assignments: [], journals: [], assessments: [], allStudents: [], allClasses: [] }

    const journalsSnap = await getDocs(query(collection(db, 'journals'), where('assignmentId', 'in', assignmentIds)))
    const journals = journalsSnap.docs.map(d => d.data() as Journal).filter(j => j.semester === parseInt(selectedSemester))

    const assessmentsSnap = await getDocs(query(collection(db, 'assessments'), where('assignmentId', 'in', assignmentIds)))
    const assessments = assessmentsSnap.docs.map(d => d.data() as Assessment).filter(a => a.semester === parseInt(selectedSemester))

    const studentsSnap = await getDocs(query(collection(db, 'applicants'), where('admissionStatus', '==', 'accepted')))
    const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Applicant))

    const classesSnap = await getDocs(collection(db, 'classes'))
    const allClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Classroom))

    return { assignments, journals, assessments, allStudents, allClasses }
  }

  const handleDownloadTemplate = async () => {
    const data = [
      ["No", "Nama Siswa", "NISN", "Absensi (%)", "Tugas 1", "Tugas 2", "Tugas 3", "Ulangan", "UTS", "UAS"]
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Template Nilai")
    XLSX.writeFile(wb, "Template_Buku_Nilai.xlsx")
    toast({ title: "Template Berhasil Diunduh" })
  }

  const handleDownloadJurnal = async () => {
    toast({ title: "Menyiapkan data jurnal..." })
    const data = await fetchAllTeacherData()
    if (!data) return

    const journalData = data.journals.map(j => {
      const assignment = data.assignments.find(a => a.id === j.assignmentId)
      return {
        "Mata Pelajaran": assignment?.subjectName,
        "Kelas": assignment?.className,
        "Pertemuan": j.meetingNumber,
        "Tanggal": j.date,
        "Jam": j.jamKe,
        "Materi": j.material,
        "Tujuan": j.learningGoal,
        "KKTP": j.kktpAchievement,
        "Keterangan": j.notes
      }
    })

    const ws = XLSX.utils.json_to_sheet(journalData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Jurnal Mengajar")
    XLSX.writeFile(wb, `Rekap_Jurnal_Sem${selectedSemester}.xlsx`)
  }

  const handleDownloadKelas = async () => {
    toast({ title: "Menyiapkan data kelas..." })
    const data = await fetchAllTeacherData()
    if (!data) return

    const wb = XLSX.utils.book_new()
    const processedClassIds = new Set<string>()

    data.assignments.forEach(asg => {
      // Mencegah pembuatan sheet duplikat untuk kelas yang sama
      if (processedClassIds.has(asg.classId)) return
      processedClassIds.add(asg.classId)

      const targetClass = data.allClasses.find(c => c.id === asg.classId)
      if (!targetClass) return

      // Hanya ambil siswa yang terdaftar di rombel ini
      const classStudents = data.allStudents.filter(s => targetClass.students?.includes(s.id))
      
      const sheetData = classStudents.map((s, idx) => ({
        "No": idx + 1,
        "Nama": s.fullName,
        "NISN": s.NISN,
        "JK": s.gender,
        "Asal Sekolah": s.originSchool
      }))

      const ws = XLSX.utils.json_to_sheet(sheetData)
      // Excel membatasi nama sheet maksimal 31 karakter
      const sheetName = `Kelas ${asg.className}`.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    if (processedClassIds.size === 0) {
      toast({ variant: "destructive", title: "Tidak ada data kelas untuk diunduh" })
      return
    }

    XLSX.writeFile(wb, "Daftar_Murid_Per_Kelas.xlsx")
  }

  const handleDownloadSemua = async () => {
    toast({ title: "Mengekspor seluruh data..." })
    const data = await fetchAllTeacherData()
    if (!data) return

    const wb = XLSX.utils.book_new()
    
    // Sheet 1: Ringkasan Penugasan
    const asgWs = XLSX.utils.json_to_sheet(data.assignments.map(a => ({ "Mapel": a.subjectName, "Kelas": a.className })))
    XLSX.utils.book_append_sheet(wb, asgWs, "Daftar Mapel")

    // Sheet 2: Jurnal
    const jurData = data.journals.map(j => {
      const assignment = data.assignments.find(a => a.id === j.assignmentId)
      return { 
        "Tgl": j.date, 
        "Mapel": assignment?.subjectName || '-',
        "Kelas": assignment?.className || '-',
        "Materi": j.material 
      }
    })
    const jurWs = XLSX.utils.json_to_sheet(jurData)
    XLSX.utils.book_append_sheet(wb, jurWs, "Rekap Jurnal")

    // Sheet 3: Nilai
    const nilWs = XLSX.utils.json_to_sheet(data.assessments.map(a => {
      const student = data.allStudents.find(s => s.id === a.studentId)
      const assignment = data.assignments.find(asg => asg.id === a.assignmentId)
      return { 
        "Nama Murid": student?.fullName || a.studentId, 
        "Mapel": assignment?.subjectName || '-',
        "Skor Akhir": a.finalScore 
      }
    }))
    XLSX.utils.book_append_sheet(wb, nilWs, "Rekap Nilai")

    XLSX.writeFile(wb, `Ekspor_Lengkap_Guru_Sem${selectedSemester}.xlsx`)
  }

  if (userLoading || staffLoading) return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  const rawAppName = config?.appName || "SIS TERPADU"
  const appName = rawAppName.toUpperCase().includes("SPMB") ? "SIS TERPADU" : rawAppName
  const appLogoUrl = config?.appLogoUrl || "/icon-logo.webp"

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 overflow-hidden shrink-0 bg-transparent flex items-center justify-center">
                {appLogoUrl ? (
                  <img src={appLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="bg-primary/20 p-2 rounded-lg flex items-center justify-center w-full h-full">
                    <GraduationCap className="w-full h-full text-primary" />
                  </div>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-headline font-bold text-lg leading-tight uppercase truncate">{appName}</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">Portal Pengajar</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <div className="space-y-6">
              <div>
                <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Utama</p>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === '/teacher' && !searchParams.has('semester')}>
                      <Link href="/teacher" className="flex items-center gap-3">
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dasbor Pengajar</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>

              <div>
                <p className="px-3 mb-2 text-[10px] font-bold text-primary uppercase tracking-widest">Buku Nilai (Semester)</p>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={selectedSemester === "1"}>
                      <Link href={`/teacher?semester=1`} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="w-5 h-5" />
                          <span>Semester 1 (Ganjil)</span>
                        </div>
                        {selectedSemester === "1" && <ChevronRight className="w-3 h-3 text-primary" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={selectedSemester === "2"}>
                      <Link href={`/teacher?semester=2`} className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="w-5 h-5" />
                          <span>Semester 2 (Genap)</span>
                        </div>
                        {selectedSemester === "2" && <ChevronRight className="w-3 h-3 text-primary" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>

              <div>
                <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unduh Laporan</p>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleDownloadTemplate} className="gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-green-500" />
                      <span className="text-xs">Template Buku Nilai</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleDownloadJurnal} className="gap-3">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      <span className="text-xs">Unduh Jurnal</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleDownloadKelas} className="gap-3">
                      <Users className="w-5 h-5 text-orange-500" />
                      <span className="text-xs">Unduh Daftar Kelas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleDownloadSemua} className="gap-3">
                      <Download className="w-5 h-5 text-primary" />
                      <span className="text-xs">Unduh Semua (Excel)</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </div>
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10">
                  <div className="flex items-center gap-3 w-full">
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Keluar</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="h-16 border-b flex items-center justify-between px-6 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex flex-col">
                <h2 className="font-bold hidden sm:block text-sm">Selamat Datang, Guru {user?.displayName}</h2>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Periode: Semester {selectedSemester}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="text-right hidden md:block">
                 <p className="text-xs font-bold leading-none">{user?.displayName}</p>
                 <p className="text-[10px] text-muted-foreground uppercase">NIP/ID: {staffData?.[0]?.email.split('@')[0]}</p>
               </div>
               <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                 <UserCircle className="w-6 h-6" />
               </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-background/50">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
