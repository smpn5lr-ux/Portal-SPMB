"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth"
import { useAuth, useUser } from "@/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { School, LogIn, Mail, Lock, Loader2, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  
  const auth = useAuth()
  const { user, loading: authLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password)
        toast({
          title: "Berhasil Masuk",
          description: "Selamat datang kembali di Portal Admin.",
        })
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(userCredential.user, { displayName: fullName })
        toast({
          title: "Akun Berhasil Dibuat",
          description: "Silakan gunakan akun Anda untuk mengelola sistem.",
        })
      }
      router.push("/dashboard")
    } catch (error: any) {
      let message = "Terjadi kesalahan. Silakan coba lagi."
      if (error.code === 'auth/email-already-in-use') message = "Email sudah terdaftar."
      if (error.code === 'auth/invalid-credential') message = "Email atau password salah."
      if (error.code === 'auth/weak-password') message = "Password minimal 6 karakter."
      
      toast({
        variant: "destructive",
        title: isLogin ? "Login Gagal" : "Pendaftaran Gagal",
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return null

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background/50 relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]"></div>

      <Card className="w-full max-w-[400px] border-border/50 shadow-2xl relative z-10 bg-card/80 backdrop-blur-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <School className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-headline text-2xl font-bold tracking-tight">
              {isLogin ? "Admin Portal" : "Daftar Admin"}
            </CardTitle>
            <CardDescription>
              {isLogin ? "Masuk untuk mengelola pendaftaran siswa baru." : "Buat akun admin baru untuk mengelola sistem."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="fullName"
                    type="text" 
                    placeholder="Nama Lengkap Admin" 
                    className="pl-10"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email" 
                  placeholder="admin@sekolah.sch.id" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />)}
              {isLogin ? "Masuk Sekarang" : "Daftar Akun"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isLogin ? "Belum punya akun? Daftar di sini" : "Sudah punya akun? Login di sini"}
            </button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
            EduEnroll Pro • Sistem Informasi Manajemen Sekolah
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
