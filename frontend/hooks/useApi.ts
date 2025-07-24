"use client"

import { useState, useEffect } from "react"

const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080'

export function useGithubStars() {
  const [stars, setStars] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/github_stars`)
        if (!response.ok) throw new Error('Failed to fetch GitHub stars')
        const data = await response.json()
        setStars(data.stars)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStars()
  }, [])

  return { stars, loading, error }
}

export function useBlogViews() {
  const [views, setViews] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchViews = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/posts`)
        if (!response.ok) throw new Error('Failed to fetch blog posts')
        const posts = await response.json()
        const totalViews = posts.reduce((sum: number, post: any) => sum + (post.views || 0), 0)
        setViews(totalViews)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchViews()
  }, [])

  return { views, loading, error }
}

export function useRecentGuest() {
  const [guest, setGuest] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecentGuest = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/comments`)
        if (!response.ok) throw new Error('Failed to fetch comments')
        const comments = await response.json()
        if (comments.length > 0) {
          setGuest(comments[0].name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchRecentGuest()
  }, [])

  return { guest, loading, error }
}

export function usePosts() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/posts`)
      if (!response.ok) throw new Error('Failed to fetch posts')
      const data = await response.json()
      setPosts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const refetch = () => {
    setLoading(true)
    setError(null)
    fetchPosts()
  }

  return { posts, loading, error, refetch }
}

export function useComments() {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/comments`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      const data = await response.json()
      setComments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [])

  const refetch = () => {
    setLoading(true)
    setError(null)
    fetchComments()
  }

  return { comments, loading, error, refetch }
}

export function usePost(id: string) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/posts/${id}.html`);
        if (!response.ok) throw new Error('Failed to fetch post');
        const htmlContent = await response.text();
        setPost({ content: htmlContent });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  return { post, loading, error };
}
