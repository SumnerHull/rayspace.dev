"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePosts } from "@/hooks/useApi"

export default function Blog() {
  const { posts, loading, error } = usePosts();

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="fade-in">
          <h1 className="text-3xl font-bold mb-4">Blog</h1>
          <p className="text-muted-foreground mb-8">
            Thoughts, tutorials, and insights on software development, technology, and engineering.
          </p>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="fade-in">
          <h1 className="text-3xl font-bold mb-4">Blog</h1>
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load blog posts: {error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="fade-in">
        <h1 className="text-2xl font-bold mb-2 text-foreground">
          Blog
        </h1>
        <p className="text-muted-foreground mb-6">
          Thoughts on software development and technology.
        </p>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No blog posts yet. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id} className="transition-all hover:shadow-lg hover:scale-[1.02]">
                <CardHeader>
                  <CardTitle className="text-xl">
                    <Link 
                      href={`/blog/${post.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {post.title}
                    </Link>
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Published: {new Date(post.published_date).toLocaleDateString()}</span>
                    <span>Views: {post.views || 0}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">
                    {post.excerpt || "Click to read more..."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
