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
  ChevronRight
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
import { doc, collection, query, where } from "firebase/firestore"
import { Staff } from "@/lib/types"

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const auth = useAuth()
  const db = useFirestore()
  const { user, loading: userLoading } = useUser()

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'system') : null, [db])
  const { data: config } = useDoc<any>(settingsRef)

  const staffQuery = useMemoFirebase(() => {
    if (!db || !user?.email) return null
    return query(collection(db, 'staff'), where('email', '==', user.email))
  }, [db, user])

  const { data: staffData, loading: staffLoading } = useCollection<Staff>(staffQuery)

  // Ambil semester dari URL atau default dari sistem
  const selectedSemester = searchParams.get('semester') || config?.activeSemester?.toString() || "1"

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

  if (userLoading || staffLoading) return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  const appName = (config?.appName && config.appName !== "PORTAL SPMB") ? config.appName : "SIS TERPADU"
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
