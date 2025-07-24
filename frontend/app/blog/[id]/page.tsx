import React from "react"
import { Card, CardContent } from "@/components/ui/card"

export async function generateStaticParams() {
  return [
    { id: '1' },
  ];
}

interface BlogPostPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const resolvedParams = await params;
  
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div id="blog-post-content">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const postId = '${resolvedParams.id}';
            const API_BASE = window.location.origin;
            
            Promise.all([
              fetch(API_BASE + '/posts/' + postId + '.html'),
              fetch(API_BASE + '/api/posts')
            ]).then(async ([postResponse, postsResponse]) => {
              if (postResponse.ok && postsResponse.ok) {
                const htmlContent = await postResponse.text();
                const posts = await postsResponse.json();
                const postMeta = posts.find(p => p.id.toString() === postId);
                
                const container = document.getElementById('blog-post-content');
                container.innerHTML = \`
                  <article class="prose prose-neutral dark:prose-invert max-w-none">
                    <h1 class="text-3xl font-bold mb-2">\${postMeta?.title || "Blog Post"}</h1>
                    \${postMeta ? \`
                      <div class="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                        <span>Published: \${new Date(postMeta.published_date).toLocaleDateString()}</span>
                        <span>Views: \${postMeta.views || 0}</span>
                      </div>
                    \` : ''}
                    <div class="post-content">\${htmlContent}</div>
                  </article>
                \`;
              } else {
                const container = document.getElementById('blog-post-content');
                container.innerHTML = \`
                  <div class="border border-destructive rounded-lg p-6">
                    <h1 class="text-2xl font-bold mb-4">Post Not Found</h1>
                    <p class="text-destructive">The requested blog post could not be found.</p>
                  </div>
                \`;
              }
            }).catch(() => {
              const container = document.getElementById('blog-post-content');
              container.innerHTML = \`
                <div class="border border-destructive rounded-lg p-6">
                  <h1 class="text-2xl font-bold mb-4">Error</h1>
                  <p class="text-destructive">Failed to load blog post.</p>
                </div>
              \`;
            });
          })();
        `
      }} />
    </div>
  );
}
