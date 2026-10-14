
"use client"

import * as React from "react"
import { 
  GraduationCap,
  LogOut,
  Loader2,
  Menu,
  BookCheck,
  LayoutDashboard,
  UserCircle
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
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { signOut } from "firebase/auth"
import { doc, collection, query, where } from "firebase/firestore"
import { Staff } from "@/lib/types"

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
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

  const appName = config?.appName || "Portal SPMB"
  const appLogoUrl = config?.appLogoUrl || "/icon-logo.webp"

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 overflow-hidden shrink-0">
                {appLogoUrl ? <img src={appLogoUrl} alt="Logo" className="w-full h-full object-contain" /> : <GraduationCap className="w-full h-full text-primary" />}
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg leading-tight">{appName}</span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">Portal Guru</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/teacher'}>
                  <Link href="/teacher" className="flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dasbor Pengajar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-5 h-5 mr-3" />
                  <span>Keluar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="h-16 border-b flex items-center justify-between px-6 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <h2 className="font-bold hidden sm:block">Selamat Datang, Guru {user?.displayName}</h2>
            </div>
            <div className="flex items-center gap-3">
               <div className="text-right hidden md:block">
                 <p className="text-xs font-bold leading-none">{user?.displayName}</p>
                 <p className="text-[10px] text-muted-foreground uppercase">NIP/NIK: {staffData?.[0]?.email.split('@')[0]}</p>
               </div>
               <UserCircle className="w-8 h-8 text-primary" />
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
