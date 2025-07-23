"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="w-full border-b border-border/40">
      <div className="container flex h-12 items-center justify-between px-4">
        <Link href="/" className="font-medium text-foreground">
          Sumner Hull
        </Link>
        <nav className="flex items-center space-x-4 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            HOME
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground">
            ABOUT
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground">
            BLOG
          </Link>
          <Link href="/guestbook" className="text-muted-foreground hover:text-foreground">
            GUESTBOOK
          </Link>
          <Link href="/resume" className="text-muted-foreground hover:text-foreground">
            RESUME
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
