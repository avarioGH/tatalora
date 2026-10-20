"use client"
import { api } from"@/lib/api"

import { useState } from"react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from"@/components/ui/card"
import { Input } from"@/components/ui/input"
import { Button } from"@/components/ui/button"
import { Label } from"@/components/ui/label"
import { Activity } from"lucide-react"

export default function LoginPage() {
 const [username, setUsername] = useState("")
 const [password, setPassword] = useState("")
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState("")

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault()
 setLoading(true)
 setError("")

 try {
 const res = await api.post("/auth/login", { username, password })

 const data = res.data
 
 if (res.status !== 200 && res.status !== 201) {
 throw new Error(data.message ||"Login failed")
 }

 // Simpan token (Dalam versi Production, sebaiknya gunakan HttpOnly Cookies, tapi ini untuk MVP)
 localStorage.setItem("erp_token", data.access_token)
 localStorage.setItem("erp_user", JSON.stringify(data.user))
 
 // Redirect ke dashboard
 window.location.href ="/"
 } catch (err: any) {
 setError(err.message)
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="flex h-screen w-screen flex-col items-center justify-center bg-muted/40">
 <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
 <div className="flex flex-col space-y-2 text-center">
 <div className="mx-auto bg-primary h-12 w-12 rounded-xl flex items-center justify-center mb-4">
 <Activity className="text-primary-foreground h-6 w-6" />
 </div>
 <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
 <p className="text-sm text-muted-foreground">
 Enter your credentials to sign in to your workspace
 </p>
 </div>

 <Card>
 <form onSubmit={handleLogin}>
 <CardHeader>
 <CardTitle>Sign In</CardTitle>
 <CardDescription>
 Use your owner or admin account.
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {error && (
 <div className="p-3 text-sm bg-destructive/15 text-destructive rounded-md border border-destructive/20">
 {error}
 </div>
 )}
 <div className="space-y-2">
 <Label htmlFor="username">Username</Label>
 <Input 
 id="username" 
 placeholder="e.g. owner" 
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 required 
 />
 </div>
 <div className="space-y-2">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
 <Label htmlFor="password">Password</Label>
 <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
 </div>
 <Input 
 id="password" 
 type="password" 
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required 
 />
 </div>
 </CardContent>
 <CardFooter>
 <Button type="submit" className="w-full" disabled={loading}>
 {loading ?"Signing in..." :"Sign In"}
 </Button>
 </CardFooter>
 </form>
 </Card>
 
 <p className="px-8 text-center text-sm text-muted-foreground">
 By clicking continue, you agree to our{""}
 <a href="#" className="underline underline-offset-4 hover:text-primary">
 Terms of Service
 </a>{""}
 and{""}
 <a href="#" className="underline underline-offset-4 hover:text-primary">
 Privacy Policy
 </a>
 .
 </p>
 </div>
 </div>
 )
}
