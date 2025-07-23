"use client"

import React from "react"

export default function About() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-foreground">About Me</h1>
        
        <div className="space-y-4 text-muted-foreground">
          <p>
            Welcome to my corner of the internet! I&apos;m a passionate full-stack software engineer 
            with a love for creating robust, efficient, and user-friendly applications.
          </p>
          
          <p>
            I specialize in modern web technologies, working across the entire stack from 
            frontend user interfaces to backend APIs and database design.
          </p>

          <div className="pt-4">
            <h3 className="text-lg font-semibold mb-2 text-foreground">Technologies</h3>
            <p><strong>Frontend:</strong> React, Next.js, TypeScript, Tailwind CSS</p>
            <p><strong>Backend:</strong> Rust, Node.js, Python, PostgreSQL</p>
            <p><strong>Tools:</strong> Docker, Git, Linux, Cloud Platforms</p>
          </div>
        </div>
      </div>
    </div>
  );
}
