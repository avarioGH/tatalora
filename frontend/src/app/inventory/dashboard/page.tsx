"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import TimberDashboard from "./TimberDashboard";
import FishDashboard from "./FishDashboard";
import { api } from "@/lib/api";

export default function SwitchableDashboard() {
  const [industry, setIndustry] = useState<string | null>(null);

  useEffect(() => {
    // Determine industry based on user profile
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    let user = userStr ? JSON.parse(userStr) : null;
    
    // Check locally first for speed
    if (user) {
       checkIndustry(user);
    }
    
    // Also fetch to be sure
    api.get('/auth/me').then(res => {
      user = res.data;
      checkIndustry(user);
    }).catch(() => {
      if (!user) checkIndustry(null);
    });
    
    function checkIndustry(u: any) {
      if (!u) {
        setIndustry('kayu'); // default
        return;
      }
      
      const uString = JSON.stringify(u).toLowerCase();
      if (uString.includes('ikan') || uString.includes('fish')) {
        setIndustry('ikan');
      } else {
        setIndustry('kayu');
      }
    }
  }, []);

  if (!industry) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  return industry === 'ikan' ? <FishDashboard /> : <TimberDashboard />;
}
