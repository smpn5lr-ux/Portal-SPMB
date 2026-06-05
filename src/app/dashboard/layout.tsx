
"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Target, 
  School, 
  BarChart3, 
  Settings,
  Menu,
  Bell,
  Search,
  UserCircle,
  LogOut,
  Loader2
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
  SidebarTrigger 
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"

const navigation = [
  { name: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Data Murid', href: '/dashboard/applicants', icon: Users },
  { name: 'Verifikasi Berkas', href: '/dashboard/verification', icon: CheckSquare },
  { name: 'Sistem Seleksi', href: '/dashboard/selection', icon: Target },
  { name: 'Manajemen Kelas', href: '/dashboard/classes', icon: School },
  { name: 'Laporan', href: '/dashboard/reports', icon: BarChart3 },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user, loading } = useUser()

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error("Logout error", error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20">
                <School className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-lg tracking-tight uppercase">Portal SPMB</span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Admin Panel</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.name}
                    className="h-11"
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === '/dashboard/settings'}
                  className="h-11"
                >
                  <Link href="/dashboard/settings" className="flex items-center gap-3 w-full">
                    <Settings className="w-5 h-5" />
                    <span className="font-medium">Pengaturan</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleLogout}
                  className="h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
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
          <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <div className="hidden md:flex items-center bg-muted/30 px-3 py-1.5 rounded-full border border-border/50 w-80">
                <Search className="w-4 h-4 text-muted-foreground mr-2" />
                <input 
                  placeholder="Cari NISN atau Nama..." 
                  className="bg-transparent border-none text-sm focus:outline-none w-full placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
              </Button>
              <div className="h-8 w-px bg-border"></div>
              <div className="flex items-center gap-3 pl-2">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-sm font-semibold">{user?.displayName || 'Admin'}</span>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Administrator</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="profil" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-6 h-6" />
                  )}
                </div>
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
