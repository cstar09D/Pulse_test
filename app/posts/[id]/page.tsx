"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  BarChart3, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  ExternalLink,
  ChevronRight,
  Target,
  Activity,
  History,
  Trash2,
  AlertTriangle,
  X,
  Layout,
  LayoutGrid,
  Filter,
  Maximize2,
  MoveHorizontal
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  Legend,
  ReferenceLine,
  ReferenceArea
} from "recharts";

// Helper function to format large numbers
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if ((data as any).isFuture || data.views === null) return null;
    return (
      <div className="bg-[#1e212b]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[180px]">
        <p className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-3 pb-2 border-b border-white/5">{label}</p>
        <div className="space-y-3">
          {payload.map((item: any, index: number) => {
            const growthKey = `${item.dataKey}_growth`;
            const growthValue = item.payload[growthKey];
            const isPositive = growthValue >= 0;
            
            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold text-gray-400 capitalize">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black" style={{ color: item.color }}>
                      {item.value?.toLocaleString() || 0}
                    </span>
                    {growthValue !== undefined && growthValue !== null && (
                      <span className={`text-[10px] font-black ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        [{isPositive ? '+' : ''}{growthValue.toLocaleString()}]
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const CustomCursor = (props: any) => {
  const { points, payload, height } = props;
  if (!payload || !payload.length || (payload[0] as any).isFuture || payload[0].views === null) return null;
  const { x, y } = points[0];
  return <line x1={x} y1={y} x2={x} y2={y + height} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />;
};

const CustomActiveDot = (props: any) => {
  const { cx, cy, stroke, payload, value } = props;
  if (!payload || (payload as any).isFuture || value === null) return null;
  return <circle cx={cx} cy={cy} r={6} fill={stroke} stroke="#fff" strokeWidth={2} />;
};

export default function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [chartLayout, setChartLayout] = useState<'combined' | 'split'>('combined');
  const [viewMode, setViewMode] = useState<'total' | 'growth'>('total');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [dayViewMode, setDayViewMode] = useState<'full' | 'hourly'>('full');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Persistence: Load settings on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('pulse60_chartLayout');
    const savedViewMode = localStorage.getItem('pulse60_viewMode');
    const savedTimeRange = localStorage.getItem('pulse60_timeRange');
    const savedDayViewMode = localStorage.getItem('pulse60_dayViewMode');

    if (savedLayout) setChartLayout(savedLayout as any);
    if (savedViewMode) setViewMode(savedViewMode as any);
    if (savedTimeRange) setTimeRange(savedTimeRange as any);
    if (savedDayViewMode) setDayViewMode(savedDayViewMode as any);
  }, []);

  // Persistence: Save settings on change
  useEffect(() => {
    localStorage.setItem('pulse60_chartLayout', chartLayout);
  }, [chartLayout]);

  useEffect(() => {
    localStorage.setItem('pulse60_viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('pulse60_timeRange', timeRange);
  }, [timeRange]);

  useEffect(() => {
    localStorage.setItem('pulse60_dayViewMode', dayViewMode);
  }, [dayViewMode]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Global style to kill all focus outlines in chart area
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .recharts-wrapper, 
      .recharts-surface, 
      .hourly-scroll-container,
      .hourly-scroll-container *,
      svg {
        outline: none !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      :focus {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [postData, setPostData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Extract available dates from metrics
  const availableDates = useMemo(() => {
    if (!postData?.metrics) return { years: [], monthsByYear: {}, daysByMonth: {} };
    
    const dates: { years: string[], monthsByYear: Record<string, string[]>, daysByMonth: Record<string, Record<string, string[]>> } = {
      years: [],
      monthsByYear: {},
      daysByMonth: {}
    };

    postData.metrics.forEach((m: any) => {
      const d = new Date(m.recorded_at);
      const year = d.getFullYear().toString();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');

      if (!dates.years.includes(year)) dates.years.push(year);
      if (!dates.monthsByYear[year]) dates.monthsByYear[year] = [];
      if (!dates.monthsByYear[year].includes(month)) dates.monthsByYear[year].push(month);
      
      if (!dates.daysByMonth[year]) dates.daysByMonth[year] = {};
      if (!dates.daysByMonth[year][month]) dates.daysByMonth[year][month] = [];
      if (!dates.daysByMonth[year][month].includes(day)) dates.daysByMonth[year][month].push(day);
    });

    // Sort everything
    dates.years.sort((a, b) => b.localeCompare(a));
    Object.keys(dates.monthsByYear).forEach(y => dates.monthsByYear[y].sort((a, b) => b.localeCompare(a)));
    Object.keys(dates.daysByMonth).forEach(y => {
      Object.keys(dates.daysByMonth[y]).forEach(m => dates.daysByMonth[y][m].sort((a, b) => b.localeCompare(a)));
    });

    return dates;
  }, [postData?.metrics]);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [selectedDay, setSelectedDay] = useState<string>(new Date().getDate().toString().padStart(2, '0'));
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);

  // Helper to get weeks of a month
  const getWeeksInMonth = (year: number, month: number) => {
    const weeks: { start: Date, end: Date, label: string }[] = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    let currentStart = new Date(firstDay);
    while (currentStart <= lastDay) {
      const dayOfWeek = currentStart.getDay(); // 0 is Sunday
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentStart.getDate() + daysUntilSunday);
      
      if (currentEnd > lastDay) {
        currentEnd.setTime(lastDay.getTime());
      }

      weeks.push({
        start: new Date(currentStart),
        end: new Date(currentEnd),
        label: `${weeks.length + 1}주차 (${currentStart.getDate()}일~${currentEnd.getDate()}일)`
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentEnd.getDate() + 1);
    }
    return weeks;
  };

  const weeksInSelectedMonth = useMemo(() => {
    const allWeeks = getWeeksInMonth(parseInt(selectedYear), parseInt(selectedMonth));
    if (!postData?.metrics) return allWeeks;

    // Filter weeks to only those that have at least one data point
    return allWeeks.filter(week => {
      return postData.metrics.some((m: any) => {
        const recordedAt = new Date(m.recorded_at);
        return recordedAt >= week.start && recordedAt <= week.end;
      });
    });
  }, [selectedYear, selectedMonth, postData?.metrics]);

  // Sync selectedWeekIndex when month changes
  useEffect(() => {
    const today = new Date();
    if (parseInt(selectedYear) === today.getFullYear() && parseInt(selectedMonth) === (today.getMonth() + 1)) {
      const idx = weeksInSelectedMonth.findIndex(w => today >= w.start && today <= w.end);
      setSelectedWeekIndex(idx !== -1 ? idx : 0);
    } else {
      setSelectedWeekIndex(0);
    }
  }, [selectedYear, selectedMonth, weeksInSelectedMonth]);

  // Update selectedDate when Year/Month/Day changes
  useEffect(() => {
    setSelectedDate(`${selectedYear}-${selectedMonth}-${selectedDay}`);
  }, [selectedYear, selectedMonth, selectedDay]);

  // Sync initial selections when data loads
  useEffect(() => {
    if (availableDates.years.length > 0 && !availableDates.years.includes(selectedYear)) {
      const latestYear = availableDates.years[0];
      setSelectedYear(latestYear);
      const latestMonth = availableDates.monthsByYear[latestYear][0];
      setSelectedMonth(latestMonth);
      const latestDay = availableDates.daysByMonth[latestYear][latestMonth][0];
      setSelectedDay(latestDay);
    }
  }, [availableDates]);

  // Chart data generator based on time range
  const chartData = useMemo(() => {
    const now = new Date();
    if (postData?.metrics && postData.metrics.length > 0) {
      const firstMetricDate = new Date([...postData.metrics].sort((a: any, b: any) => 
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      )[0].recorded_at);
      firstMetricDate.setHours(0, 0, 0, 0);

      if (timeRange === 'day') {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
        const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

        const filteredMetrics = postData.metrics.filter((m: any) => {
          const recordedAt = new Date(m.recorded_at);
          return recordedAt >= dayStart && recordedAt <= dayEnd;
        });

        const sortedMetrics = [...filteredMetrics].sort((a, b) => 
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );

        let metricsToRender = [...sortedMetrics];
        
        // Find latest older metric for baseline
        const olderMetrics = postData.metrics
          .filter((m: any) => new Date(m.recorded_at) < dayStart)
          .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
        const baseMetric = olderMetrics.length > 0 ? olderMetrics[0] : null;

        // If 1-5 actual metrics exist today, prepend previous day's last data as starting point
        if (baseMetric && sortedMetrics.length >= 1 && sortedMetrics.length <= 5) {
          const baseDate = new Date(baseMetric.recorded_at);
          const baseTimeStr = baseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          // Prepend virtual starting point at the very beginning
          metricsToRender.unshift({
            recorded_at: new Date(dayStart.getTime() - 1000).toISOString(),
            views: baseMetric.views,
            likes: baseMetric.likes,
            comments: baseMetric.comments,
            isVirtual: true,
            displayTime: `(전일) ${baseTimeStr}`
          });
        }

        return metricsToRender.map((m: any, index: number) => {
          const date = new Date(m.recorded_at);
          const minutes = date.getMinutes();
          const prev = index > 0 ? metricsToRender[index - 1] : null;
          
          return {
            time: m.displayTime || date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            views: m.views,
            likes: m.likes,
            comments: m.comments,
            views_growth: (prev && !m.isVirtual) ? Math.max(0, m.views - prev.views) : 0,
            isMajorTick: minutes === 0 || minutes === 30,
            isFuture: date > now,
            isVirtual: m.isVirtual
          };
        });
      }

      if (timeRange === 'week') {
        const selectedWeek = weeksInSelectedMonth[selectedWeekIndex] || weeksInSelectedMonth[0];
        if (!selectedWeek) return [];

        // Show 2 weeks: current selected week and previous week
        const days = [];
        let startDate = new Date(selectedWeek.start);
        startDate.setDate(startDate.getDate() - 7); // Go back 7 days
        
        let curr = new Date(startDate);
        const endDate = new Date(selectedWeek.end);
        
        while (curr <= endDate) {
          days.push(new Date(curr));
          curr.setDate(curr.getDate() + 1);
        }

        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

        return days.map((d, index) => {
          const isWeekBoundary = index === 7;
          const monthLabel = (d.getMonth() + 1).toString().padStart(2, '0');
          const dayLabel = d.getDate().toString().padStart(2, '0');
          const weekdayLabel = weekdays[d.getDay()];
          const dateStr = `${monthLabel}. ${dayLabel}. (${weekdayLabel})${isWeekBoundary ? ' [시작]' : ''}`;
          
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
          const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

          const dayMetrics = (postData?.metrics || []).filter((m: any) => {
            const recordedAt = new Date(m.recorded_at);
            return recordedAt >= dayStart && recordedAt <= dayEnd;
          });

          if (dayStart > now) {
            return {
              time: dateStr,
              views: null,
              likes: null,
              comments: null,
              views_growth: null,
              likes_growth: null,
              comments_growth: null,
              isFuture: true,
              m: d.getMonth() + 1,
              d: d.getDate(),
              isWeekBoundary
            };
          }

          if (dayMetrics.length > 0) {
            const lastMetric = [...dayMetrics].sort((a: any, b: any) => 
              new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
            )[dayMetrics.length - 1];

            return {
              time: dateStr,
              views: lastMetric.views,
              likes: lastMetric.likes,
              comments: lastMetric.comments,
              views_growth: 0,
              likes_growth: 0,
              comments_growth: 0,
              isFuture: false,
              m: d.getMonth() + 1,
              d: d.getDate(),
              isWeekBoundary
            };
          } else {
            const viewsVal = (dayStart < firstMetricDate) ? 0 : null;
            return {
              time: dateStr,
              views: viewsVal,
              likes: viewsVal,
              comments: viewsVal,
              views_growth: viewsVal === 0 ? 0 : null,
              likes_growth: viewsVal === 0 ? 0 : null,
              comments_growth: viewsVal === 0 ? 0 : null,
              isFuture: false,
              m: d.getMonth() + 1,
              d: d.getDate(),
              isWeekBoundary
            };
          }
        }).map((item, index, arr) => {
          const prevItem = index > 0 ? arr[index - 1] : null;
          
          if (item.views === null) return item;

          let baseViews = 0;
          let baseLikes = 0;
          let baseComments = 0;
          let hasBase = false;

          if (prevItem && prevItem.views !== null) {
            baseViews = prevItem.views;
            baseLikes = prevItem.likes || 0;
            baseComments = prevItem.comments || 0;
            hasBase = true;
          } else {
            // Search for the latest metric before this day's start
            const currentDayDate = new Date(parseInt(selectedYear), item.m - 1, item.d);
            currentDayDate.setHours(0, 0, 0, 0);
            
            const olderMetrics = postData.metrics
              .filter((m: any) => new Date(m.recorded_at) < currentDayDate)
              .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
            
            if (olderMetrics.length > 0) {
              baseViews = olderMetrics[0].views;
              baseLikes = olderMetrics[0].likes;
              baseComments = olderMetrics[0].comments;
              hasBase = true;
            } else {
              // No older data exists. Growth from 0.
              baseViews = 0;
              baseLikes = 0;
              baseComments = 0;
              hasBase = true;
            }
          }

          return {
            ...item,
            views_growth: Math.max(0, item.views - baseViews),
            likes_growth: Math.max(0, item.likes - baseLikes),
            comments_growth: Math.max(0, item.comments - baseComments)
          };
        });
      }

      const targetDate = new Date(selectedDate);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      // Get number of days in the month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthDays = [];
      
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        monthDays.push(d);
      }

      // Map to daily metrics
      let dailyData = monthDays.map((d) => {
        const monthLabel = (d.getMonth() + 1).toString().padStart(2, '0');
        const dayLabel = d.getDate().toString().padStart(2, '0');
        const weekdayLabel = d.toLocaleDateString('ko-KR', { weekday: 'short' });
        const dateStr = `${monthLabel}. ${dayLabel}. (${weekdayLabel})`;

        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const dayMetrics = postData.metrics.filter((m: any) => {
          const recordedAt = new Date(m.recorded_at);
          return recordedAt >= dayStart && recordedAt <= dayEnd;
        });

        if (dayMetrics.length > 0) {
          const lastMetric = dayMetrics.sort((a: any, b: any) => 
            new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
          )[dayMetrics.length - 1];

          return {
            time: dateStr,
            views: lastMetric.views,
            likes: lastMetric.likes,
            comments: lastMetric.comments,
            views_growth: 0,
            likes_growth: 0,
            comments_growth: 0,
            hasData: true,
            isFuture: false,
            isMidMonth: d.getDate() === 15
          };
        } else {
          if (dayStart > now) {
            return {
              time: dateStr,
              views: null,
              likes: null,
              comments: null,
              views_growth: null,
              likes_growth: null,
              comments_growth: null,
              hasData: false,
              isFuture: true,
              isMidMonth: d.getDate() === 15
            };
          }

          if (dayStart < firstMetricDate) {
            return {
              time: dateStr,
              views: 0,
              likes: 0,
              comments: 0,
              views_growth: 0,
              likes_growth: 0,
              comments_growth: 0,
              hasData: true,
              isMidMonth: d.getDate() === 15
            };
          }

          return {
            time: dateStr,
            views: null,
            likes: null,
            comments: null,
            views_growth: null,
            likes_growth: null,
            comments_growth: null,
            hasData: false,
            isMidMonth: d.getDate() === 15
          };
        }
      });

      // Calculate growth
      return dailyData.map((item, index, arr) => {
        const prevItem = index > 0 ? arr[index - 1] : null;
        
        if (item.views === null) return item;

        let baseViews = 0;
        let baseLikes = 0;
        let baseComments = 0;
        let hasBase = false;

        if (prevItem && prevItem.views !== null) {
          baseViews = prevItem.views;
          baseLikes = prevItem.likes || 0;
          baseComments = prevItem.comments || 0;
          hasBase = true;
        } else {
          // Search for the latest metric before this day's start
          const currentDayDate = new Date(year + '-' + item.time.split('/')[0] + '-' + item.time.split('/')[1]);
          currentDayDate.setHours(0, 0, 0, 0);
          
          const olderMetrics = postData.metrics
            .filter((m: any) => new Date(m.recorded_at) < currentDayDate)
            .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
          
          if (olderMetrics.length > 0) {
            baseViews = olderMetrics[0].views;
            baseLikes = olderMetrics[0].likes;
            baseComments = olderMetrics[0].comments;
            hasBase = true;
          } else {
            // No older data exists. Growth from 0.
            baseViews = 0;
            baseLikes = 0;
            baseComments = 0;
            hasBase = true;
          }
        }

        return {
          ...item,
          views_growth: Math.max(0, item.views - baseViews),
          likes_growth: Math.max(0, item.likes - baseLikes),
          comments_growth: Math.max(0, item.comments - baseComments)
        };
      });
    }

    const points = timeRange === 'day' ? 24 : (timeRange === 'week' ? 7 : 30);
    let monday = new Date(now);
    const dayOfWeek = monday.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(monday.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    return Array.from({ length: points }, (_, i) => {
      const baseViews = 5000 + Math.random() * 2000;
      const baseLikes = 200 + Math.random() * 100;
      const baseComments = 10 + Math.random() * 5;
      
      let label = "";
      if (timeRange === 'day') label = `${i}:00`;
      else if (timeRange === 'week') {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        label = d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
      }
      else label = `Mar ${i + 1}`;

      return {
        time: label,
        views: Math.floor(baseViews * (1 + i * 0.1)),
        likes: Math.floor(baseLikes * (1 + i * 0.08)),
        comments: Math.floor(baseComments * (1 + i * 0.05)),
        views_growth: Math.floor(Math.random() * 500),
        likes_growth: Math.floor(Math.random() * 50),
        comments_growth: Math.floor(Math.random() * 5)
      };
    });
  }, [postData?.metrics, timeRange, selectedDate, weeksInSelectedMonth, selectedWeekIndex]);

   const weekBoundaryPoint = useMemo(() => {
    if (timeRange !== 'week' || !chartData || chartData.length === 0) return null;
    return chartData.find(d => (d as any).isWeekBoundary)?.time || null;
  }, [chartData, timeRange]);

  const midMonthPoint = useMemo(() => {
    if (timeRange !== 'month' || !chartData || chartData.length === 0) return null;
    return chartData.find(d => (d as any).isMidMonth)?.time || null;
  }, [chartData, timeRange]);

  // Auto-scroll to the end of the chart when horizontal scroll is enabled
  useEffect(() => {
    const isScrollable = chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month';
    if (isScrollable) {
      setIsAutoScrolling(true);
      const timer = setTimeout(() => {
        const containers = document.querySelectorAll('.hourly-scroll-container');
        containers.forEach(container => {
          container.scrollLeft = (container as HTMLElement).scrollWidth;
        });
        setIsAutoScrolling(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setIsAutoScrolling(false);
    }
  }, [dayViewMode, chartLayout, timeRange, postData, viewMode, chartData.length]);

  useEffect(() => {
    const fetchPostData = async () => {
      try {
        const res = await fetch(`/api/posts/${id}`);
        const resData = await res.json();
        if (res.ok && resData.data) {
          setPostData(resData.data);
        }
      } catch (err) {
        console.error("Failed to fetch post data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPostData();
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-[1400px] mx-auto px-2 sm:px-4 py-6 md:py-16 w-full animate-in fade-in duration-700">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <section className="bg-surface border border-surface-border rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-12 mb-6 sm:mb-12 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-8 mb-12">
            <div className="w-full lg:w-[600px] aspect-video rounded-[2rem] sm:rounded-[3rem] bg-white/5 animate-pulse" />
            <div className="flex-1 space-y-6">
              <div className="h-6 w-32 bg-white/5 rounded-full animate-pulse" />
              <div className="h-20 w-full bg-white/5 rounded-2xl animate-pulse" />
              <div className="flex gap-6">
                <div className="h-12 w-40 bg-white/5 rounded-2xl animate-pulse" />
                <div className="h-12 w-40 bg-white/5 rounded-2xl animate-pulse" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        </section>
      </main>
    );
  }

  // Derived data with fallbacks
  const post = {
    id,
    title: postData?.title || "",
    author: postData?.author || (postData?.platform === 'youtube' ? 'YouTube Creator' : 'Instagram User'),
    url: postData?.url || "",
    platform: postData?.platform || "Blog",
    created_at: postData?.created_at || new Date().toISOString(),
    thumbnail_url: postData?.thumbnail_url || ""
  };

  const latestMetrics = {
    views: postData?.views || 0,
    likes: postData?.likes || 0,
    comments: postData?.comments || 0,
    recorded_at: postData?.recorded_at || new Date().toISOString()
  };



  const confirmDelete = () => {
    // Implement delete logic here
    setShowDeleteModal(false);
  };

  return (
    <main className="max-w-[1400px] mx-auto px-2 sm:px-4 py-6 md:py-16 w-full">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-8 sm:mb-12">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-xl bg-white/5 group-hover:bg-accent/20 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">Back to Dashboard</span>
        </Link>
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 text-red-500/60 hover:text-red-500 transition-colors group"
        >
          <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">Remove Tracker</span>
          <div className="p-2 rounded-xl bg-red-500/5 group-hover:bg-red-500/20 transition-all">
            <Trash2 className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Hero Header Section */}
      <section className="bg-surface border border-surface-border rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-12 mb-6 sm:mb-12 shadow-2xl relative overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-pink-500/5 rounded-full blur-[80px] -ml-32 -mb-32" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row gap-8 mb-12">
            {/* Thumbnail Image */}
            <div className="w-full lg:w-[600px] aspect-[16/9] rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl flex-shrink-0 bg-surface-dark">
              <img 
                src={post.thumbnail_url}
                alt={post.title}
                className="w-full h-full object-cover object-center"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest">
                  Active Tracking
                </span>
                <span className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" /> Started Mar 20, 2024
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-accent/20">
                    {post.author[0]}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Author</div>
                    <div className="text-white font-bold">{post.author}</div>
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10 hidden sm:block" />
                <div className="w-full sm:w-auto min-w-0">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Post URL</div>
                  <a 
                    href={post.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-accent hover:text-accent-light transition-colors group min-w-0"
                  >
                    <span className="font-bold truncate custom-scrollbar block max-w-full overflow-x-auto custom-scrollbar pb-2">{post.url}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid - Updated for Mobile Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-8">
            <div className="bg-white/5 p-1.5 sm:p-6 rounded-lg sm:rounded-3xl border border-white/5 flex flex-col items-center lg:items-start gap-1 sm:gap-2 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-400 text-[8px] sm:text-sm font-medium whitespace-nowrap">
                <Eye className="w-2.5 h-2.5 sm:w-4 h-4" /> Views
              </div>
              <div className="text-sm sm:text-3xl font-bold text-white truncate">{formatNumber(latestMetrics.views)}</div>
            </div>
            <div className="bg-white/5 p-1.5 sm:p-6 rounded-lg sm:rounded-3xl border border-white/5 flex flex-col items-center lg:items-start gap-1 sm:gap-2 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-400 text-[8px] sm:text-sm font-medium whitespace-nowrap">
                <Heart className="w-2.5 h-2.5 sm:w-4 h-4" /> Likes
              </div>
              <div className="text-sm sm:text-3xl font-bold text-white truncate">{formatNumber(latestMetrics.likes)}</div>
            </div>
            <div className="bg-white/5 p-1.5 sm:p-6 rounded-lg sm:rounded-3xl border border-white/5 flex flex-col items-center lg:items-start gap-1 sm:gap-2 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-400 text-[8px] sm:text-sm font-medium whitespace-nowrap">
                <MessageCircle className="w-2.5 h-2.5 sm:w-4 h-4" /> Comments
              </div>
              <div className="text-sm sm:text-3xl font-bold text-white truncate">{formatNumber(latestMetrics.comments)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Chart Section with Sticky Controls */}
      <section className="relative">
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* Sticky Controls Sidebar */}
          <aside className="w-full xl:w-[280px] xl:sticky xl:top-24 space-y-6">
            {/* Desktop View - Vertical Selects/Buttons */}
            <div className="hidden xl:block bg-surface border border-surface-border p-6 rounded-[2.5rem] shadow-xl">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Filter className="w-4 h-4 text-accent" /> Visualization
              </h3>
              
              <div className="space-y-8">
                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Layout Style</div>
                  <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                    {(['combined', 'split'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          if (chartLayout !== l) {
                            setIsAutoScrolling(true);
                            setChartLayout(l);
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-[11px] font-bold capitalize transition-all ${
                          chartLayout === l 
                            ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Time Range</div>
                  <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                    {(['day', 'week', 'month'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          if (timeRange !== r) {
                            setIsAutoScrolling(true);
                            setTimeRange(r);
                          }
                        }}
                        className={`px-2 py-2.5 rounded-xl text-[11px] font-bold capitalize transition-all text-center ${
                          timeRange === r 
                            ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                  {/* Date Selectors in Sidebar */}
                  <div className="mt-6">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Date</div>
                    <div className={`grid gap-2 ${timeRange === 'month' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-1">
                        <select 
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full bg-transparent text-white text-[10px] font-bold px-1 py-1.5 focus:outline-none appearance-none cursor-pointer hover:text-accent transition-colors text-center"
                        >
                          {availableDates.years.map(y => <option key={y} value={y} className="bg-surface text-white">{y}년</option>)}
                        </select>
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-xl p-1">
                        <select 
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="w-full bg-transparent text-white text-[10px] font-bold px-1 py-1.5 focus:outline-none appearance-none cursor-pointer hover:text-accent transition-colors text-center"
                        >
                          {(availableDates.monthsByYear[selectedYear] || []).map(m => <option key={m} value={m} className="bg-surface text-white">{parseInt(m)}월</option>)}
                        </select>
                      </div>
                      
                      {timeRange === 'day' && (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-1">
                          <select 
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value)}
                            className="w-full bg-transparent text-white text-[10px] font-bold px-1 py-1.5 focus:outline-none appearance-none cursor-pointer hover:text-accent transition-colors text-center"
                          >
                            {(availableDates.daysByMonth[selectedYear]?.[selectedMonth] || []).map(d => <option key={d} value={d} className="bg-surface text-white">{parseInt(d)}일</option>)}
                          </select>
                        </div>
                      )}

                      {timeRange === 'week' && (
                        <div className="bg-white/5 border border-white/5 rounded-xl p-1">
                          <select 
                            value={selectedWeekIndex}
                            onChange={(e) => setSelectedWeekIndex(parseInt(e.target.value))}
                            className="w-full bg-transparent text-white text-[10px] font-bold px-1 py-1.5 focus:outline-none appearance-none cursor-pointer hover:text-accent transition-colors text-center"
                          >
                            {weeksInSelectedMonth.map((w, i) => (
                              <option key={i} value={i} className="bg-surface text-white">{w.label.split(' ')[0]}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {timeRange === 'day' && (
                    <div className="mt-4">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Day View Mode</div>
                      <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                        {(['full', 'hourly'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              if (dayViewMode !== mode) {
                                setIsAutoScrolling(true);
                                setDayViewMode(mode);
                              }
                            }}
                            className={`px-4 py-2.5 rounded-xl text-[11px] font-bold capitalize transition-all ${
                              dayViewMode === mode 
                                ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {mode === 'full' ? '전체' : '시간'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {/* Mobile View - Horizontal Selects */}
            <div className="xl:hidden flex flex-row items-center gap-2 bg-surface border border-surface-border p-2 rounded-2xl shadow-xl overflow-x-auto custom-scrollbar pb-2">
              <div className="flex-1 min-w-[100px]">
                <select 
                  value={chartLayout}
                  onChange={(e) => {
                    setIsAutoScrolling(true);
                    setChartLayout(e.target.value as any);
                  }}
                  className="w-full bg-accent/10 border border-accent/20 text-white text-[11px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                >
                  <option value="combined">Combined</option>
                  <option value="split">Split</option>
                </select>
              </div>
              <div className="flex-1 min-w-[100px]">
                <select 
                  value={viewMode}
                  onChange={(e) => {
                    setIsAutoScrolling(true);
                    setViewMode(e.target.value as any);
                  }}
                  className="w-full bg-accent/10 border border-accent/20 text-white text-[11px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                >
                  <option value="total">Total</option>
                  <option value="growth">Growth</option>
                </select>
              </div>
              <div className="flex-1 min-w-[100px]">
                <select 
                  value={timeRange}
                  onChange={(e) => {
                    setIsAutoScrolling(true);
                    setTimeRange(e.target.value as any);
                  }}
                  className="w-full bg-accent/10 border border-accent/20 text-white text-[11px] font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent appearance-none"
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Main Charts Area */}
          <div className="flex-1 w-full space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 sm:w-7 h-7 text-accent" />
                  Performance Trends
                </h2>
              </div>
              {latestMetrics.recorded_at && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Last updated: {new Date(latestMetrics.recorded_at as string).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}, {new Date(latestMetrics.recorded_at as string).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {chartLayout === "combined" ? (
              <div className="bg-surface border border-surface-border rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-10 shadow-xl overflow-hidden w-full">
                {/* Fixed Legend */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#4f46e5]" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ec4899]" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Likes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#14b8a6]" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Comments</span>
                    </div>
                  </div>

                </div>

                <div className="relative">
                  {(chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month') && (
                    <div className="absolute -top-10 right-0 z-30 flex items-center gap-2 text-[10px] font-black text-accent/60 uppercase tracking-widest animate-pulse bg-accent/5 px-3 py-1.5 rounded-full border border-accent/10 pointer-events-none">
                      <MoveHorizontal className="w-3 h-3" />
                      <span>Scroll to explore</span>
                    </div>
                  )}
                  <div className="flex h-[500px] w-full overflow-hidden">
                  {/* Fixed Left Y-Axis Column (Views) */}
                  <div className="w-14 sm:w-20 flex-shrink-0 z-50 bg-surface mr-[-1px] border-r border-white/5 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" className="outline-none">
                      <ComposedChart data={chartData as any[]} margin={{ top: 10, right: 0, left: 10, bottom: 40 }} className="outline-none">
                        <YAxis 
                          yAxisId="left" 
                          stroke="#4f46e5" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(val) => formatNumber(val)} 
                          domain={['auto', 'auto']} 
                        />
                        <Area yAxisId="left" type="monotone" dataKey="views" stroke="none" fill="none" connectNulls={true} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Scrollable Chart Content */}
                  <div 
                    tabIndex={-1}
                    className={`flex-1 hourly-scroll-container transition-all outline-none focus:outline-none ![&_.recharts-wrapper]:outline-none ![&_svg]:outline-none ${isAutoScrolling ? 'opacity-0 invisible duration-0' : 'opacity-100 visible duration-500'} ${chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month' ? 'overflow-x-auto custom-scrollbar pb-2' : 'overflow-hidden'}`}
                  >
                    <div style={{ 
                      width: chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month' ? `${Math.max(100, chartData.length * 2)}%` : '100%',
                      height: '100%',
                      minWidth: '100%'
                    }}>
                      <ResponsiveContainer width="100%" height="100%" key={`combined-${timeRange}`} className="outline-none">
                        <ComposedChart data={chartData as any[]} margin={{ top: 10, right: 10, left: 10, bottom: 40 }} className="outline-none">
                          <defs>
                            <linearGradient id="colorViewsCombined" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} pointerEvents="none" />
                          <XAxis 
                            dataKey="time" 
                            stroke="#6b7280" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            dy={15}
                            pointerEvents="none"
                            minTickGap={timeRange === 'day' ? 5 : 80}
                            interval={0}
                            ticks={timeRange === 'day' 
                              ? (chartData as any[]).filter(d => d.isMajorTick).map(d => d.time)
                              : (timeRange === 'week' && dayViewMode === 'full' && chartData.length > 1 && chartData[0] 
                                ? [chartData[0].time, weekBoundaryPoint, chartData[chartData.length - 1].time].filter(Boolean) as string[] 
                                : (timeRange === 'month' && chartData.length > 1 && chartData[0]
                                  ? [chartData[0].time, midMonthPoint, chartData[chartData.length - 1].time].filter(Boolean) as string[]
                                  : undefined))}
                            tick={(props) => {
                              const { x, y, payload, index, visibleTicksCount } = props;
                              let textAnchor: "start" | "end" | "middle" = "middle";
                              let dx = 0;
                              if (index === 0) {
                                textAnchor = "start";
                              } else if (index === visibleTicksCount - 1) {
                                textAnchor = "end";
                              }
                              return (
                                <text x={x} y={y} dy={24} textAnchor={textAnchor} fill="#6b7280" fontSize={12}>
                                  {payload.value}
                                </text>
                              );
                            }}
                          />
                          <YAxis yAxisId="left" hide domain={['auto', 'auto']} />
                          <YAxis yAxisId="right" orientation="right" hide domain={['auto', 'auto']} />
                          <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />
                          <Area yAxisId="left" type="monotone" dataKey="views" name="Views" stroke="#4f46e5" strokeWidth={4} fill="url(#colorViewsCombined)" connectNulls={true} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={<CustomActiveDot />} />
                          <Line yAxisId="right" type="monotone" dataKey="likes" name="Likes" stroke="#ec4899" strokeWidth={3} connectNulls={true} dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }} activeDot={<CustomActiveDot />} />
                          <Line yAxisId="right" type="monotone" dataKey="comments" name="Comments" stroke="#14b8a6" strokeWidth={3} connectNulls={true} dot={{ r: 4, fill: '#14b8a6', strokeWidth: 2, stroke: '#fff' }} activeDot={<CustomActiveDot />} />
                          {timeRange === 'week' && weekBoundaryPoint && (
                            <ReferenceLine 
                              key={`boundary-combined-${weekBoundaryPoint}`}
                              x={weekBoundaryPoint} 
                              yAxisId="left"
                              stroke="#ffffff" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              isFront={true}
                              label={{ value: '이번 주 시작', position: 'insideTopRight', fill: '#ffffff', fontSize: 13, dy: 10, fontWeight: 'bold' }}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Fixed Right Y-Axis Column (Likes/Comments) */}
                  <div className="w-14 sm:w-20 flex-shrink-0 z-50 bg-surface ml-[-1px] border-l border-white/5 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" className="outline-none">
                      <ComposedChart data={chartData as any[]} margin={{ top: 10, right: 10, left: 0, bottom: 40 }} className="outline-none">
                        <YAxis 
                          yAxisId="right" 
                          orientation="right"
                          stroke="#ec4899" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(val) => formatNumber(val)} 
                          domain={['auto', 'auto']} 
                        />
                        {/* Invisible series for right axis scale */}
                        <Line yAxisId="right" type="monotone" dataKey="likes" stroke="none" dot={false} connectNulls={true} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Views Chart */}
                  <div className="bg-surface border border-surface-border rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-accent" /> Views Over Time
                      </h3>
                      {((dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month') && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-accent/60 uppercase tracking-widest animate-pulse">
                          <MoveHorizontal className="w-3 h-3" />
                          <span>Scroll</span>
                        </div>
                      )}
                    </div>
                  <div className="flex h-[350px] w-full overflow-hidden">
                    {/* Fixed Y-Axis Column */}
                    <div className="w-14 sm:w-20 flex-shrink-0 z-50 bg-surface mr-[-1px] border-r border-white/5 overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%" className="outline-none">
                        <AreaChart data={chartData as any[]} margin={{ top: 10, right: 0, left: 10, bottom: 40 }} className="outline-none">
                          <YAxis 
                            stroke="#6b7280" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => formatNumber(val)} 
                            domain={['auto', 'auto']} 
                          />
                          <Area type="monotone" dataKey="views" stroke="none" fill="none" connectNulls={true} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div tabIndex={-1} className={`flex-1 hourly-scroll-container transition-all outline-none focus:outline-none ![&_.recharts-wrapper]:outline-none ![&_svg]:outline-none ${isAutoScrolling ? 'opacity-0 invisible duration-0' : 'opacity-100 visible duration-500'} ${chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month' ? 'overflow-x-auto custom-scrollbar pb-2' : 'overflow-hidden'}`}>
                    <div style={{ 
                      width: chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month' ? `${Math.max(100, chartData.length * 2)}%` : '100%',
                      height: '100%',
                      minWidth: '100%'
                    }}>
                      {((dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month') && (
                        <div className="absolute -top-10 right-0 z-30 flex items-center gap-2 text-[10px] font-black text-accent/60 uppercase tracking-widest animate-pulse">
                          <MoveHorizontal className="w-3 h-3" />
                          <span>Scroll</span>
                        </div>
                      )}
                        <ResponsiveContainer width="100%" height="100%" key={`views-${timeRange}`} className="outline-none">
                          <AreaChart data={chartData as any[]} margin={{ top: 10, right: 10, left: 10, bottom: 40 }} className="outline-none">
                            <defs>
                              <linearGradient id="colorViewsSplit" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} pointerEvents="none" />
                            <XAxis 
                              dataKey="time" 
                              stroke="#6b7280" 
                              fontSize={12} 
                              tickLine={false} 
                              axisLine={false} 
                              pointerEvents="none" 
                              minTickGap={timeRange === 'day' ? 5 : 80}
                              interval={0}
                              ticks={timeRange === 'day' 
                                ? (chartData as any[]).filter(d => d.isMajorTick).map(d => d.time)
                                : (timeRange === 'week' && dayViewMode === 'full' && chartData.length > 1 && chartData[0] 
                                  ? [chartData[0].time, weekBoundaryPoint, chartData[chartData.length - 1].time].filter(Boolean) as string[] 
                                  : (timeRange === 'month' && chartData.length > 1 && chartData[0]
                                    ? [chartData[0].time, midMonthPoint, chartData[chartData.length - 1].time].filter(Boolean) as string[]
                                    : undefined))}
                              tick={(props) => {
                                const { x, y, payload, index, visibleTicksCount } = props;
                                let textAnchor: "start" | "end" | "middle" = "middle";
                                let dx = 0;
                                if (index === 0) {
                                  textAnchor = "start";
                                } else if (index === visibleTicksCount - 1) {
                                  textAnchor = "end";
                                }
                                return (
                                  <text x={x} y={y} dy={24} textAnchor={textAnchor} fill="#6b7280" fontSize={12}>
                                    {payload.value}
                                  </text>
                                );
                              }}
                            />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />
                            <Area type="monotone" dataKey="views" stroke="#4f46e5" strokeWidth={3} fill="url(#colorViewsSplit)" connectNulls={true} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={<CustomActiveDot />} />
                            {timeRange === 'week' && chartData[7] && (
                              <ReferenceLine 
                                key={`boundary-views-${chartData[7].time}`}
                                x={chartData[7].time} 
                                stroke="#ffffff" 
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                isFront={true}
                                label={{ value: '이번 주 시작', position: 'insideTopRight', fill: '#ffffff', fontSize: 12, dy: 10, fontWeight: 'bold' }}
                              />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Likes Chart */}
                  <div className="bg-surface border border-surface-border rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" /> Likes Trend
                      </h3>
                      {((dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month') && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-pink-500/60 uppercase tracking-widest animate-pulse">
                          <MoveHorizontal className="w-3 h-3" />
                          <span>Scroll</span>
                        </div>
                      )}
                    </div>
                    <div className="flex h-[350px] w-full overflow-hidden">
                      {/* Fixed Y-Axis Column */}
                      <div className="w-12 sm:w-16 flex-shrink-0 z-50 bg-surface mr-[-1px] border-r border-white/5 overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%" className="outline-none">
                          <AreaChart data={chartData as any[]} margin={{ top: 10, right: 0, left: 10, bottom: 40 }} className="outline-none">
                            <YAxis 
                              stroke="#6b7280" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              tickFormatter={(val) => formatNumber(val)} 
                              domain={['auto', 'auto']} 
                            />
                            <Area type="monotone" dataKey="likes" stroke="none" fill="none" dot={false} connectNulls={true} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div tabIndex={-1} className={`flex-1 hourly-scroll-container transition-all outline-none focus:outline-none ![&_.recharts-wrapper]:outline-none ![&_svg]:outline-none ${isAutoScrolling ? 'opacity-0 invisible duration-0' : 'opacity-100 visible duration-500'} ${chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month' ? 'overflow-x-auto overflow-y-hidden custom-scrollbar pb-2' : 'overflow-hidden'}`}>
                        <div style={{ 
                          width: chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month' ? `${Math.max(100, chartData.length * 2)}%` : '100%',
                          height: '100%',
                          minWidth: '100%'
                        }}>
                          <ResponsiveContainer width="100%" height="100%" key={`likes-${timeRange}`} className="outline-none">
                            <AreaChart data={chartData as any[]} margin={{ top: 10, right: 10, left: 10, bottom: 40 }} className="outline-none">
                              <defs>
                                <linearGradient id="colorLikesSplit" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} pointerEvents="none" />
                              <XAxis 
                                dataKey="time" 
                                stroke="#6b7280" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                pointerEvents="none" 
                                interval={0}
                                ticks={timeRange === 'day' 
                                  ? (chartData as any[]).filter(d => d.isMajorTick).map(d => d.time)
                                  : (timeRange === 'week' && dayViewMode === 'full' && chartData.length > 1 && chartData[0] 
                                    ? [chartData[0].time, weekBoundaryPoint, chartData[chartData.length - 1].time].filter(Boolean) as string[] 
                                    : (timeRange === 'month' && chartData.length > 1 && chartData[0]
                                      ? [chartData[0].time, midMonthPoint, chartData[chartData.length - 1].time].filter(Boolean) as string[]
                                      : undefined))}
                                tick={(props) => {
                                  const { x, y, payload, index, visibleTicksCount } = props;
                                  let textAnchor: "start" | "end" | "middle" = "middle";
                                  let dx = 0;
                                  if (index === 0) {
                                    textAnchor = "start";
                                  } else if (index === visibleTicksCount - 1) {
                                    textAnchor = "end";
                                  }
                                  return (
                                    <text x={x} y={y} dy={24} textAnchor={textAnchor} fill="#6b7280" fontSize={12}>
                                      {payload.value}
                                    </text>
                                  );
                                }}
                              />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />
                              <Area type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={3} fill="url(#colorLikesSplit)" connectNulls={true} dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }} activeDot={<CustomActiveDot />} />
                              {timeRange === 'week' && chartData[7] && (
                                <ReferenceLine 
                                  key={`boundary-likes-${chartData[7].time}`}
                                  x={chartData[7].time} 
                                  stroke="#ffffff" 
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  isFront={true}
                                  label={{ value: '이번 주 시작', position: 'insideTopRight', fill: '#ffffff', fontSize: 12, dy: 10, fontWeight: 'bold' }}
                                />
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments Chart */}
                  <div className="bg-surface border border-surface-border rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-teal-500" /> Comments Trend
                      </h3>
                      {((dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month') && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-teal-500/60 uppercase tracking-widest animate-pulse">
                          <MoveHorizontal className="w-3 h-3" />
                          <span>Scroll</span>
                        </div>
                      )}
                    </div>
                    <div className="flex h-[350px] w-full overflow-hidden">
                      {/* Fixed Y-Axis Column */}
                      <div className="w-12 sm:w-16 flex-shrink-0 z-50 bg-surface mr-[-1px] border-r border-white/5 overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%" className="outline-none">
                          <AreaChart data={chartData as any[]} margin={{ top: 10, right: 0, left: 10, bottom: 40 }} className="outline-none">
                            <YAxis 
                              stroke="#6b7280" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              tickFormatter={(val) => formatNumber(val)} 
                              domain={['auto', 'auto']} 
                            />
                            <Area type="monotone" dataKey="comments" stroke="none" fill="none" dot={false} connectNulls={true} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div tabIndex={-1} className={`flex-1 hourly-scroll-container transition-all outline-none focus:outline-none ![&_.recharts-wrapper]:outline-none ![&_svg]:outline-none ${isAutoScrolling ? 'opacity-0 invisible duration-0' : 'opacity-100 visible duration-500'} ${chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month' ? 'overflow-x-auto overflow-y-hidden custom-scrollbar pb-2' : 'overflow-hidden'}`}>
                        <div style={{ 
                          width: chartData.length > 15 || (dayViewMode === 'hourly' && timeRange === 'day') || timeRange === 'month' ? `${Math.max(100, chartData.length * 2)}%` : '100%',
                          height: '100%',
                          minWidth: '100%'
                        }}>
                          <ResponsiveContainer width="100%" height="100%" key={`comments-${timeRange}`} className="outline-none">
                            <AreaChart data={chartData as any[]} margin={{ top: 10, right: 10, left: 10, bottom: 40 }} className="outline-none">
                              <defs>
                                <linearGradient id="colorCommentsSplit" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} pointerEvents="none" />
                              <XAxis 
                                dataKey="time" 
                                stroke="#6b7280" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                pointerEvents="none" 
                                interval={0}
                                ticks={timeRange === 'day' 
                                  ? (chartData as any[]).filter(d => d.isMajorTick).map(d => d.time)
                                  : (timeRange === 'week' && dayViewMode === 'full' && chartData.length > 1 && chartData[0] 
                                    ? [chartData[0].time, weekBoundaryPoint, chartData[chartData.length - 1].time].filter(Boolean) as string[] 
                                    : (timeRange === 'month' && chartData.length > 1 && chartData[0]
                                      ? [chartData[0].time, midMonthPoint, chartData[chartData.length - 1].time].filter(Boolean) as string[]
                                      : undefined))}
                                tick={(props) => {
                                  const { x, y, payload, index, visibleTicksCount } = props;
                                  let textAnchor: "start" | "end" | "middle" = "middle";
                                  if (index === 0) {
                                    textAnchor = "start";
                                  } else if (index === visibleTicksCount - 1) {
                                    textAnchor = "end";
                                  }
                                  return (
                                    <text x={x} y={y} dy={24} textAnchor={textAnchor} fill="#6b7280" fontSize={12}>
                                      {payload.value}
                                    </text>
                                  );
                                }}
                              />
                              <YAxis hide domain={['auto', 'auto']} />
                              <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />
                              <Area type="monotone" dataKey="comments" stroke="#14b8a6" strokeWidth={3} fill="url(#colorCommentsSplit)" connectNulls={true} dot={{ r: 4, fill: '#14b8a6', strokeWidth: 2, stroke: '#fff' }} activeDot={<CustomActiveDot />} />
                              {timeRange === 'week' && chartData[7] && (
                                <ReferenceLine 
                                  key={`boundary-comments-${chartData[7].time}`}
                                  x={chartData[7].time} 
                                  stroke="#ffffff" 
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  isFront={true}
                                  label={{ value: '이번 주 시작', position: 'insideTopRight', fill: '#ffffff', fontSize: 12, dy: 10, fontWeight: 'bold' }}
                                />
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
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
