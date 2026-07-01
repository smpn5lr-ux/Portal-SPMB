
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
  Bell,
  Search,
  UserCircle,
  LogOut,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  Menu
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut, updateProfile } from "firebase/auth"
import { doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

const navigation = [
  { name: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Data Murid', href: '/dashboard/applicants', icon: Users },
  { name: 'Verifikasi Berkas', href: '/dashboard/verification', icon: CheckSquare },
  { name: 'Sistem Seleksi', href: '/dashboard/selection', icon: Target },
  { name: 'Manajemen Kelas', href: '/dashboard/classes', icon: School },
  { name: 'Manajemen Pegawai', href: '/dashboard/staff', icon: UserPlus },
  { name: 'Laporan', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Sampah', href: '/dashboard/trash', icon: Trash2 },
]

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  const { isMobile, setOpenMobile } = useSidebar()
  
  const [isProfileOpen, setIsProfileOpen] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [updating, setUpdating] = React.useState(false)

  const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, 'settings', 'system')
  }, [db])

  const { data: config } = useDoc<any>(settingsRef)

  React.useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
    if (user) {
      setNewName(user.displayName || "")
    }
  }, [user, userLoading, router])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error("Logout error", error)
    }
  }

  const handleUpdateName = async () => {
    if (!user || !newName.trim() || updating) return
    setUpdating(true)
    try {
      await updateProfile(user, { displayName: newName.trim() })
      toast({
        title: "Profil Diperbarui",
        description: "Nama tampilan Anda berhasil diubah.",
      })
      setIsProfileOpen(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: "Terjadi kesalahan saat mengubah nama.",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const appName = config?.appName || "Portal SPMB"
  const appLogoUrl = config?.appLogoUrl

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar className="border-r border-border">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 overflow-hidden shrink-0 bg-transparent">
              {appLogoUrl ? (
                <img src={appLogoUrl} alt="App Logo" className="w-full h-full object-contain bg-transparent" />
              ) : (
                <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20 flex items-center justify-center w-full h-full">
                  <School className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-headline font-bold text-lg tracking-tight uppercase line-clamp-1">{appName}</span>
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
                  <Link 
                    href={item.href} 
                    className="flex items-center gap-3 w-full"
                    onClick={handleMenuClick}
                  >
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
                <Link 
                  href="/dashboard/settings" 
                  className="flex items-center gap-3 w-full"
                  onClick={handleMenuClick}
                >
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
            <SidebarTrigger className="lg:hidden">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <div className="hidden md:flex items-center bg-muted/30 px-3 py-1.5 rounded-full border border-border/50 w-80">
              <Search className="w-4 h-4 text-muted-foreground mr-2" />
              <input 
                placeholder="Cari NISN atau Nama Murid..." 
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
            
            <div 
              className="flex items-center gap-3 pl-2 cursor-pointer hover:bg-muted/30 p-1.5 rounded-lg transition-colors group"
              onClick={() => setIsProfileOpen(true)}
            >
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {user?.displayName || 'Admin'}
                </span>
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Administrator</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary overflow-hidden relative">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="profil" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-6 h-6" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Pencil className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 bg-background/50">
          {children}
        </main>
      </SidebarInset>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Ubah Nama Profil</DialogTitle>
            <DialogDescription>
              Ubah nama tampilan administrator Anda di sistem.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Masukkan nama baru..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateName} disabled={updating}>
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  )
}
