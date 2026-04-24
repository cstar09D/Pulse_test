"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Video, Camera, Play, Heart, MessageCircle, Trash2, CheckCircle2, Circle, X, AlertTriangle, Eye } from "lucide-react";

type Post = {
  id: string;
  platform: "youtube" | "instagram";
  url: string;
  title: string;
  thumbnail_url: string;
  views?: string | number;
  likes?: string | number;
  comments?: string | number;
  author?: string;
};

const MOCK_POSTS: Post[] = [
  {
    id: "1",
    platform: "youtube",
    url: "https://youtube.com/watch?v=1",
    title: "10 Minimalist Setup Hacks for Productivity",
    thumbnail_url: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&h=400&fit=crop",
    views: "1200000",
    likes: "45000",
    comments: "3200",
    author: "Tech & Flow"
  },
  {
    id: "2",
    platform: "instagram",
    url: "https://instagram.com/p/2",
    title: "Coffee shop series part 3 ☕️",
    thumbnail_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=600&fit=crop",
    likes: "8900",
    comments: "421",
    author: "@minimal_lifestyle"
  }
];

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

function formatNumber(numStr: string | number | undefined): string {
  if (numStr === undefined || numStr === null) return "0";
  const str = String(numStr);
  const num = parseInt(str.replace(/,/g, ''), 10);
  if (isNaN(num)) return str;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  
  // Custom Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/posts");
        const resData = await res.json();
        if (res.ok && resData.data) {
          setPosts(resData.data);
          
          // Restore scroll position after data is loaded
          const savedScrollPos = sessionStorage.getItem("dashboardScrollPos");
          if (savedScrollPos) {
            // Use setTimeout to ensure the DOM has rendered the posts
            setTimeout(() => {
              window.scrollTo({
                top: parseInt(savedScrollPos),
                behavior: 'instant'
              });
              sessionStorage.removeItem("dashboardScrollPos");
            }, 100);
          }
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      }
    };
    fetchPosts();
  }, []);

  const handlePostClick = () => {
    sessionStorage.setItem("dashboardScrollPos", window.scrollY.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const resData = await res.json();

      if (res.ok && resData.data) {
        setMessage("✅ Post URL successfully tracked!");
        setUrl("");
        // Prepend the new post to the list dynamically
        setPosts((prev) => [resData.data, ...prev]);
      } else {
        setMessage("❌ " + (resData.error || "Failed to add post."));
      }
    } catch (err) {
      setMessage("❌ An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length && posts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map(p => p.id)));
    }
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIdsToDelete([id]);
    setShowDeleteModal(true);
  };

  const handleDeleteBulk = () => {
    if (selectedIds.size === 0) return;
    setIdsToDelete(Array.from(selectedIds));
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (idsToDelete.length === 0) return;

    try {
      const payload = idsToDelete.length === 1 
        ? { id: idsToDelete[0] } 
        : { ids: idsToDelete };

      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const deletedSet = new Set(idsToDelete);
        setPosts((prev) => prev.filter(p => !deletedSet.has(p.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          idsToDelete.forEach(id => next.delete(id));
          return next;
        });
        setShowDeleteModal(false);
        setIdsToDelete([]);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 md:py-20">
      <header className="mb-16 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Track Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-light">Pulse</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Monitor your YouTube & Instagram metrics in one unified dashboard. Modern, fast, and secure.
        </p>
      </header>

      {/* Input Section */}
      <section className="mb-20 max-w-2xl mx-auto">
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-center bg-surface border border-surface-border rounded-full p-2 shadow-2xl transition-all focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20"
        >
          <Search className="absolute left-6 text-gray-500 w-5 h-5" />
          <input
            type="url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube or Instagram URL here..."
            required
            className="w-full bg-transparent border-none pl-14 pr-4 py-3 text-foreground placeholder:text-gray-600 focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-accent hover:bg-accent-light text-white font-medium px-8 py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? "Processing..." : "Track"}
          </button>
        </form>
        {message && (
          <p className="mt-4 text-center text-sm font-medium animate-in fade-in transition-all">
            {message}
          </p>
        )}
      </section>

      {/* Grid Display */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Recent Tracking</h2>
            <div className="text-sm text-gray-400 font-medium">{posts.length} Active Trackers</div>
          </div>
          
          {posts.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5"
              >
                {selectedIds.size === posts.length ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Circle className="w-4 h-4" />}
                {selectedIds.size === posts.length ? "Deselect All" : "Select All"}
              </button>
              
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteBulk}
                  className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedIds.size})
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div 
              key={post.id}
              className={`group relative bg-surface border rounded-3xl overflow-hidden transition-all duration-300 transform hover:-translate-y-1 ${
                selectedIds.has(post.id) ? 'border-accent ring-2 ring-accent/20' : 'border-surface-border hover:border-surface-border/80'
              }`}
            >
              {/* Selection Circle */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(post.id);
                }}
                className={`absolute top-4 right-4 z-20 cursor-pointer transition-opacity duration-200 ${selectedIds.has(post.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                {selectedIds.has(post.id) ? (
                  <CheckCircle2 className="w-6 h-6 text-accent bg-surface rounded-full shadow-lg" />
                ) : (
                  <Circle className="w-6 h-6 text-white/50 bg-black/20 backdrop-blur-md rounded-full shadow-lg" />
                )}
              </div>

              {/* Individual Delete Button */}
              <button
                onClick={(e) => handleDeleteSingle(e, post.id)}
                className="absolute bottom-4 right-4 z-20 p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                title="Delete this post"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <Link 
                href={`/posts/${post.id}`} 
                onClick={handlePostClick}
                className="block h-full cursor-pointer"
              >
                <div className="relative aspect-video overflow-hidden bg-gray-900 border-b border-surface-border">
                  <img 
                    src={post.thumbnail_url} 
                    alt={post.title} 
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  
                  <div className="absolute top-4 left-4 p-2 rounded-xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl">
                    {post.platform === "youtube" ? (
                      <YoutubeIcon className="w-5 h-5 text-white" />
                    ) : (
                      <InstagramIcon className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e212b]/90 via-transparent to-transparent pointer-events-none" />
                </div>

                <div className="p-6">
                  <div className="text-sm font-bold text-accent mb-2 uppercase tracking-wider">
                    {post.platform === 'youtube' 
                      ? (post.url.includes('/shorts/') ? 'YouTube Shorts' : 'YouTube') 
                      : 'Instagram'}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-100 leading-snug line-clamp-2 mb-6 group-hover:text-accent-light transition-colors">
                    {post.title}
                  </h3>

                  <div className="flex items-center gap-4 text-gray-400 text-sm">
                    <div className="flex items-center gap-1.5" title={`${post.views || 0} views`}>
                      <Eye className="w-4 h-4" /> <span>{formatNumber(post.views)}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title={`${post.likes || 0} likes`}>
                      <Heart className="w-4 h-4" /> <span>{formatNumber(post.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title={`${post.comments || 0} comments`}>
                      <MessageCircle className="w-4 h-4" /> <span>{formatNumber(post.comments)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setShowDeleteModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-surface border border-surface-border p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
                <p className="text-gray-400">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-8 leading-relaxed">
              Are you sure you want to delete {idsToDelete.length === 1 ? 'this post' : `these ${idsToDelete.length} posts`}? This will permanently remove the data from your dashboard.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-lg shadow-red-500/20"
              >
                Delete Now
              </button>
            </div>

            <button 
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
