import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });
    }

    // 1. Fetch Post Detail
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Fallback for missing author (e.g. legacy data or missing column)
    let author = post.author;
    if (!author && post.platform === 'youtube') {
      const videoId = getYouTubeVideoId(post.url);
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      if (videoId && YOUTUBE_API_KEY) {
        try {
          const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`);
          const ytData = await ytRes.json();
          if (ytData.items && ytData.items.length > 0) {
            author = ytData.items[0].snippet.channelTitle;
            // Safeguard: try to update the DB, but don't crash if column is missing
            try {
              await supabase.from('posts').update({ author }).eq('id', id);
            } catch (dbErr) {
              console.warn('Author column might be missing, skipping DB update');
            }
          }
        } catch (e) {
          console.error('Auto-fetch author error:', e);
        }
      }
    }

    // 2. Fetch Metrics History
    const { data: metrics, error: metricsError } = await supabase
      .from('post_metrics')
      .select('*')
      .eq('post_id', id)
      .order('recorded_at', { ascending: true });

    if (metricsError) {
      console.error('Metrics Fetch Error:', metricsError);
    }

    return NextResponse.json({ 
      data: {
        ...post,
        author: author || post.author || 'YouTube Creator',
        metrics: metrics || []
      } 
    });

function getYouTubeVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
