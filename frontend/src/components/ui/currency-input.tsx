"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string
  onChange: (value: number) => void
  prefix?: string
}

export function CurrencyInput({
  value,
  onChange,
  prefix,
  className,
  placeholder = "0",
  ...props
}: CurrencyInputProps) {
  // Format numeric number into Indonesian dot-separated string
  const formatDisplay = (val: number | string) => {
    if (val === "" || val === null || val === undefined) return ""
    const num = typeof val === "string" ? parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) : val
    if (isNaN(num)) return ""
    return Math.floor(num).toLocaleString("id-ID")
  }

  const [displayValue, setDisplayValue] = useState(() => formatDisplay(value))

  useEffect(() => {
    setDisplayValue(formatDisplay(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Strip everything except digits
    const cleaned = raw.replace(/[^0-9]/g, "")
    if (!cleaned) {
      setDisplayValue("")
      onChange(0)
      return
    }

    const num = parseInt(cleaned, 10)
    setDisplayValue(num.toLocaleString("id-ID"))
    onChange(num)
  }

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-2.5 text-xs text-muted-foreground font-semibold pointer-events-none select-none">
          {prefix}
        </span>
      )}
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`${prefix ? "pl-8" : ""} ${className || ""}`}
      />
    </div>
  )
}
