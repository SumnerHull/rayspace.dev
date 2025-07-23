"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useComments } from "@/hooks/useApi"

export default function Guestbook() {
  const { comments, loading, error, refetch } = useComments();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGithubSignIn = () => {
    window.location.href = '/api/auth/github';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const comment = formData.get('comment') as string;
    
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      });
      
      if (response.ok) {
        (e.target as HTMLFormElement).reset();
        refetch();
      } else {
        alert('Failed to submit comment');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      alert('Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="fade-in">
        <h1 className="text-2xl font-bold mb-2 text-foreground">
          Guestbook
        </h1>
        <p className="text-muted-foreground mb-6">
          Leave a message or say hello!
        </p>

        {/* Sign in / Comment form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Leave a Comment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={handleGithubSignIn} className="w-full">
                Sign in with GitHub to comment
              </Button>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                  name="comment"
                  placeholder="Write your message here..."
                  className="w-full min-h-[100px] p-3 border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Comment"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Comments</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-muted rounded-full"></div>
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-full mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">Failed to load comments: {error}</p>
              </CardContent>
            </Card>
          ) : comments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No comments yet. Be the first to leave a message!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {comment.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{comment.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{comment.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
