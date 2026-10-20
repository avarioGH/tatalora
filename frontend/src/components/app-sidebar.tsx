"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { SaasSidebar } from "./saas-sidebar"

export function AppSidebar() {
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("erp_user")
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch(e) {}
      }
    }
  }, [])

  if (!mounted) return null

  return <SaasSidebar />
}
