"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Resume() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="fade-in">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-reseda-green to-asparagus bg-clip-text text-transparent">
              Resume
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-lg max-w-none dark:prose-invert">
            <div className="space-y-8">
              <section>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Experience</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-foreground">Full-Stack Software Engineer</h4>
                    <p className="text-sm text-muted-foreground">Current Position</p>
                    <p className="text-muted-foreground mt-2">
                      Developing robust web applications using modern technologies including React, Next.js, 
                      Rust, and cloud infrastructure. Focus on creating efficient, scalable solutions.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Skills</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Frontend</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>React & Next.js</li>
                      <li>TypeScript</li>
                      <li>Tailwind CSS</li>
                      <li>Modern JavaScript</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Backend</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>Rust</li>
                      <li>Node.js</li>
                      <li>PostgreSQL</li>
                      <li>RESTful APIs</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Education</h3>
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold text-foreground">Computer Science</h4>
                  <p className="text-muted-foreground">
                    Focused on software engineering principles, algorithms, and modern development practices.
                  </p>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
