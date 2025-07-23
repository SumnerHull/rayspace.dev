"use client"

import React from "react";
import { StatCard } from "@/components/stat-card";
import { useGithubStars, useBlogViews, useRecentGuest } from "@/hooks/useApi";

export default function Home() {
  const { stars, loading: starsLoading } = useGithubStars();
  const { views, loading: viewsLoading } = useBlogViews();
  const { guest, loading: guestLoading } = useRecentGuest();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="fade-in">
        {/* Profile Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Sumner Hull
          </h1>
          <p className="text-muted-foreground">
            Full-Stack Software Engineer
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            title="GitHub Stars"
            value={stars}
            loading={starsLoading}
          />
          <StatCard
            title="Blog Views"
            value={views}
            loading={viewsLoading}
          />
          <StatCard
            title="Recent Guest"
            value={guest || "No guests yet"}
            loading={guestLoading}
          />
        </div>

        {/* About Section */}
        <div className="text-center">
          <p className="text-muted-foreground max-w-2xl mx-auto">
            I specialize in modern web technologies and enjoy creating seamless user experiences. 
            My expertise spans across frontend frameworks like React and Next.js, backend technologies 
            including Rust and Node.js, and cloud infrastructure.
          </p>
        </div>
      </div>
    </div>
  );
}
