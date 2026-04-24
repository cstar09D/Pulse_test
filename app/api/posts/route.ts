import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

function getYouTubeVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let platform = '';
    let title = 'Unknown Title';
    let thumbnail_url = 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=600&h=400&fit=crop';
    let views = '0';
    let likes = '0';
    let comments = '0';

    if (url.includes('instagram.com')) {
      platform = 'instagram';
      title = 'Instagram Post';
      likes = '1200'; // Numeric string for BIGINT
      comments = '50';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'youtube';
      const videoId = getYouTubeVideoId(url);

      if (videoId) {
        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
        if (YOUTUBE_API_KEY) {
          const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`);
          const ytData = await ytRes.json();
          
          if (ytData.items && ytData.items.length > 0) {
            const snippet = ytData.items[0].snippet;
            const stats = ytData.items[0].statistics;
            title = snippet.title;
            thumbnail_url = snippet.thumbnails.high?.url || snippet.thumbnails.default?.url;
            views = stats.viewCount || '0';
            likes = stats.likeCount || '0';
            comments = stats.commentCount || '0';
          }
        } else {
          // Mock data if no key is provided so UI still works!
          console.warn('⚠️ YOUTUBE_API_KEY is not set. Using Mock Data.');
          title = "User Added YouTube Video " + videoId.substring(0, 4);
          views = Math.floor(Math.random() * 500000).toString();
          likes = Math.floor(Math.random() * 10000).toString();
          comments = Math.floor(Math.random() * 500).toString();
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported URL platform.' }, { status: 400 });
    }

    const payload = { platform, url, title, thumbnail_url, views, likes, comments };

    if (supabase) {
      const { data, error } = await supabase
        .from('posts')
        .insert([payload])
        .select();

      if (error) {
        console.error('Supabase Insert Error:', error);
        return NextResponse.json({ error: 'Failed to save post' }, { status: 500 });
      }

      // Record initial metrics
      const newPost = data[0];
      await supabase.from('post_metrics').insert([{
        post_id: newPost.id,
        views: parseInt(views.toString()) || 0,
        likes: parseInt(likes.toString()) || 0,
        comments: parseInt(comments.toString()) || 0
      }]);

      return NextResponse.json({ success: true, data: newPost }, { status: 201 });
    }

    // Fallback if supabase is not initialized
    return NextResponse.json({
      success: true,
      data: { id: Date.now().toString(), ...payload },
      message: 'Supabase missing. Data returned but not saved.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ data: [] });
    }

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .is('deleted_at', null) // 소기 삭제되지 않은 데이터만 가져옴
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Fetch Error:', error);
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });
    }

    const { id, ids } = await req.json();
    const now = new Date().toISOString();

    if (id) {
      // Soft Delete: deleted_at 컬럼을 현재 시간으로 업데이트
      const { error } = await supabase
        .from('posts')
        .update({ deleted_at: now })
        .eq('id', id);
      if (error) throw error;
    } else if (ids && Array.isArray(ids)) {
      // Bulk Soft Delete
      const { error } = await supabase
        .from('posts')
        .update({ deleted_at: now })
        .in('id', ids);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'ID or IDs are required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
