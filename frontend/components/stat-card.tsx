"use client"

import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number | null
  loading?: boolean
}

export function StatCard({ title, value, loading = false }: StatCardProps) {
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-3 text-center">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-foreground">
            {loading ? "..." : value || "0"}
          </div>
          <div className="text-xs text-muted-foreground">
            {title}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
