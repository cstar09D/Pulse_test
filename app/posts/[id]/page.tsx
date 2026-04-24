"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  TrendingUp, 
  BarChart3, 
  Clock,
  Eye,
  Heart,
  MessageCircle,
  RefreshCcw,
  ExternalLink,
  Trash2,
  X,
  AlertTriangle
} from "lucide-react";
import { 
  LineChart, 
  ComposedChart,
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from "recharts";

type Metric = {
  views: number;
  likes: number;
  comments: number;
  recorded_at: string;
};

type PostDetail = {
  id: string;
  platform: "youtube" | "instagram";
  url: string;
  title: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  comments: number;
  created_at: string;
  metrics: Metric[];
};

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

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("day");
  const [viewMode, setViewMode] = useState<"total" | "growth">("total");
  const [chartLayout, setChartLayout] = useState<"combined" | "split">("combined");

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/posts/${id}`);
        const resData = await res.json();
        if (res.ok) {
          setPost(resData.data);
        }
      } catch (err) {
        console.error("Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const confirmDelete = async () => {
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        router.push("/");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 animate-pulse font-medium">
      Loading metrics data...
    </div>
  );
  
  if (!post) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <div className="text-2xl font-bold text-gray-300">Post not found</div>
      <Link href="/" className="px-6 py-2 bg-accent rounded-full text-white font-medium">Go Back</Link>
    </div>
  );

  // 날짜 포맷팅 헬퍼 (YYYY-MM-DD)
  const formatDate = (date: Date) => {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  };

  // 데이터 가공 로직
  const getChartData = () => {
    if (!post) return [];

    const now = new Date();
    const todayStr = formatDate(now);
    let rawData: any[] = [];

    if (timeRange === "day") {
      rawData = post.metrics
        .filter(m => formatDate(new Date(m.recorded_at)) === todayStr)
        .map(m => ({
          time: new Date(m.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          views: Number(m.views),
          likes: Number(m.likes),
          comments: Number(m.comments),
          timestamp: new Date(m.recorded_at).getTime()
        }));
    } else {
      const dailyData: Record<string, Metric> = {};
      post.metrics.forEach(m => {
        const dateKey = formatDate(new Date(m.recorded_at));
        if (!dailyData[dateKey] || new Date(m.recorded_at) > new Date(dailyData[dateKey].recorded_at)) {
          dailyData[dateKey] = m;
        }
      });

      const rangeDates = timeRange === "week" 
        ? (() => {
            const day = now.getDay() || 7;
            const monday = new Date(now);
            monday.setDate(now.getDate() - day + 1);
            return Array.from({ length: 7 }, (_, i) => {
              const d = new Date(monday);
              d.setDate(monday.getDate() + i);
              return d;
            });
          })()
        : Array.from({ length: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() }, (_, i) => 
            new Date(now.getFullYear(), now.getMonth(), i + 1)
          );

      rawData = rangeDates.map(d => {
        const dateKey = formatDate(d);
        const m = dailyData[dateKey];
        return {
          time: timeRange === "week" ? (d.getMonth() + 1) + '/' + d.getDate() : (d.getDate()) + '일',
          views: m ? Number(m.views) : null,
          likes: m ? Number(m.likes) : null,
          comments: m ? Number(m.comments) : null,
          timestamp: d.getTime()
        };
      });
    }

    // 상승량 모드(Growth) 처리: 첫 번째 유효한 데이터 포인트를 기준으로 차이 계산
    if (viewMode === "growth" && rawData.length > 0) {
      const firstValid = rawData.find(d => d.views !== null);
      if (firstValid) {
        return rawData.map(d => ({
          ...d,
          views: d.views !== null ? d.views - firstValid.views : null,
          likes: d.likes !== null ? d.likes - firstValid.likes : null,
          comments: d.comments !== null ? d.comments - firstValid.comments : null,
        }));
      }
    }

    return rawData;
  };

  const chartData = getChartData();

  // 마지막 수치 가져오기 (항상 실제 데이터의 마지막 기준)
  const latestMetrics = post.metrics.length > 0 
    ? post.metrics[post.metrics.length - 1] 
    : { views: post.views, likes: post.likes, comments: post.comments, recorded_at: null };

  return (
    <main className="max-w-[1400px] mx-auto px-4 py-12 md:py-16">
      <div className="flex items-center justify-between mb-12">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-medium text-lg">Back to Dashboard</span>
        </Link>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all font-bold shadow-lg shadow-red-500/5"
        >
          <Trash2 className="w-5 h-5" />
          Delete Tracker
        </button>
      </div>

      {/* Header Card */}
      <section className="bg-surface border border-surface-border rounded-[2.5rem] p-8 md:p-12 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -z-10 rounded-full" />
        
        <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start text-center lg:text-left">
          <div className="relative w-full max-w-[400px] aspect-video rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            <img 
              src={post.thumbnail_url} 
              alt={post.title} 
              className="object-cover w-full h-full"
            />
            <div className="absolute top-4 left-4 p-3 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
              {post.platform === "youtube" ? (
                <YoutubeIcon className="w-6 h-6 text-white" />
              ) : (
                <InstagramIcon className="w-6 h-6 text-white" />
              )}
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold text-sm tracking-widest uppercase">
                <TrendingUp className="w-4 h-4" />
                Live Performance
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-medium text-sm">
                <Clock className="w-4 h-4" />
                Registered: {new Date(post.created_at).toLocaleDateString()} {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-gray-400 line-clamp-1 break-all bg-white/5 px-4 py-2 rounded-xl text-sm border border-white/5">
                {post.url}
              </p>
              <a 
                href={post.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-accent/10 hover:bg-accent text-accent hover:text-white border border-accent/20 transition-all shadow-lg flex-shrink-0"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center lg:items-start gap-2">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <Eye className="w-4 h-4" /> Views
                </div>
                <div className="text-3xl font-bold text-white">{formatNumber(Number(latestMetrics.views))}</div>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center lg:items-start gap-2">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <Heart className="w-4 h-4" /> Likes
                </div>
                <div className="text-3xl font-bold text-white">{formatNumber(Number(latestMetrics.likes))}</div>
              </div>
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col items-center lg:items-start gap-2">
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <MessageCircle className="w-4 h-4" /> Comments
                </div>
                <div className="text-3xl font-bold text-white">{formatNumber(Number(latestMetrics.comments))}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chart Section with Sticky Controls */}
      <section className="relative">
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* Floating Controls Sidebar */}
          <aside className="xl:sticky xl:top-24 w-full xl:w-[180px] flex-shrink-0 z-10">
            <div className="bg-surface/50 backdrop-blur-xl border border-surface-border rounded-[2rem] p-5 shadow-2xl space-y-8">
              {/* Layout Toggle */}
              <div className="space-y-3">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Layout</div>
                <div className="flex flex-col bg-white/5 p-1 rounded-2xl border border-white/5">
                  {(['combined', 'split'] as const).map((layout) => (
                    <button
                      key={layout}
                      onClick={() => setChartLayout(layout)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                        chartLayout === layout 
                          ? 'bg-white/10 text-white shadow-lg' 
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {layout === 'combined' ? 'Combined' : 'Split'}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="space-y-3">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Mode</div>
                <div className="flex flex-col bg-white/5 p-1 rounded-2xl border border-white/5">
                  {(['total', 'growth'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                        viewMode === mode 
                          ? 'bg-white/10 text-white shadow-lg' 
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {mode === 'total' ? 'Total' : 'Growth'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="space-y-3">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Range</div>
                <div className="flex flex-col bg-white/5 p-1 rounded-2xl border border-white/5">
                  {(['day', 'week', 'month'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                        timeRange === range 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {range === 'day' ? 'Day' : range === 'week' ? 'Week' : 'Month'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Charts Area */}
          <div className="flex-1 w-full space-y-8">
            <div className="flex items-end justify-between mb-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-accent" />
                Performance Trends
              </h2>
              {latestMetrics.recorded_at && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Last updated: {new Date(latestMetrics.recorded_at as string).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(latestMetrics.recorded_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {chartLayout === "combined" ? (
              <div className="bg-surface border border-surface-border rounded-[2.5rem] p-8 md:p-10 shadow-xl overflow-hidden">
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorViewsCombined" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={15}
                        interval={timeRange === 'day' ? 1 : 2}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#4f46e5" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => formatNumber(val)} 
                        domain={['auto', 'auto']}
                        allowDataOverflow={false}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#ec4899" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => formatNumber(val)} 
                        domain={['auto', 'auto']}
                        allowDataOverflow={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e212b', border: '1px solid #ffffff10', borderRadius: '20px', padding: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                        itemStyle={{ fontSize: '13px', fontWeight: '600' }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={50} 
                        iconType="circle"
                        wrapperStyle={{ paddingTop: '0', marginBottom: '20px' }}
                      />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="views" 
                        name="Views"
                        stroke="#4f46e5" 
                        strokeWidth={4} 
                        fillOpacity={1}
                        fill="url(#colorViewsCombined)"
                        dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#1e212b' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        connectNulls={true}
                        animationDuration={1000}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="likes" 
                        name="Likes"
                        stroke="#ec4899" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#1e212b' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        connectNulls={true}
                        animationDuration={1000}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="comments" 
                        name="Comments"
                        stroke="#14b8a6" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#14b8a6', strokeWidth: 2, stroke: '#1e212b' }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                        connectNulls={true}
                        animationDuration={1000}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Views Chart */}
                <div className="bg-surface border border-surface-border rounded-[2.5rem] p-8 shadow-xl overflow-hidden">
                  <h3 className="text-lg font-bold text-gray-300 mb-8 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-accent" /> Views Over Time
                  </h3>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorViewsSplit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#6b7280" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          interval={timeRange === 'day' ? 1 : 2}
                        />
                        <YAxis 
                          stroke="#6b7280" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(val) => formatNumber(val)} 
                          domain={['auto', 'auto']}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e212b', border: '1px solid #ffffff10', borderRadius: '16px' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          stroke="#4f46e5" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorViewsSplit)" 
                          connectNulls={true}
                          dot={{ r: 4, fill: '#4f46e5' }}
                          activeDot={{ r: 8 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Likes Chart */}
                  <div className="bg-surface border border-surface-border rounded-[2.5rem] p-8 shadow-xl overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-300 mb-8 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-500" /> Likes Trend
                    </h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis 
                            dataKey="time" 
                            stroke="#6b7280" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false} 
                            interval={timeRange === 'day' ? 2 : 4}
                          />
                          <YAxis 
                            stroke="#6b7280" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => formatNumber(val)} 
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e212b', border: '1px solid #ffffff10', borderRadius: '16px' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="likes" 
                            stroke="#ec4899" 
                            strokeWidth={3} 
                            dot={{ r: 3, fill: '#ec4899' }} 
                            activeDot={{ r: 6 }} 
                            connectNulls={true}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Comments Chart */}
                  <div className="bg-surface border border-surface-border rounded-[2.5rem] p-8 shadow-xl overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-300 mb-8 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-teal-500" /> Comments Trend
                    </h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis 
                            dataKey="time" 
                            stroke="#6b7280" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false} 
                            interval={timeRange === 'day' ? 2 : 4}
                          />
                          <YAxis 
                            stroke="#6b7280" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => formatNumber(val)} 
                            domain={['auto', 'auto']}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e212b', border: '1px solid #ffffff10', borderRadius: '16px' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="comments" 
                            stroke="#14b8a6" 
                            strokeWidth={3} 
                            dot={{ r: 3, fill: '#14b8a6' }} 
                            activeDot={{ r: 6 }} 
                            connectNulls={true}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
              Are you sure you want to delete this tracker? All historical data for this post will be permanently hidden from your dashboard.
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
