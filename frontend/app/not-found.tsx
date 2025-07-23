"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="fade-in text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-6xl font-bold bg-gradient-to-r from-reseda-green to-asparagus bg-clip-text text-transparent">
              404
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
            <p className="text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Button asChild>
              <Link href="/">
                Return Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
