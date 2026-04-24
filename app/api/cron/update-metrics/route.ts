import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const youtubeApiKey = process.env.YOUTUBE_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// YouTube Video ID 추출 함수 (중복 사용을 위해 다시 정의)
function getYouTubeVideoId(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[7].length === 11) return match[7];
  
  const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];
  
  return null;
}

export async function GET(req: Request) {
  // 보안을 위해 간단한 비밀번호 체크 (선택 사항, 필요 시 헤더 등으로 구현 가능)
  // 여기서는 로컬 실행을 가정하고 진행합니다.

  try {
    if (!supabase || !youtubeApiKey) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    // 1. 모든 유튜브 포스트 가져오기
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('id, url, platform')
      .eq('platform', 'youtube')
      .is('deleted_at', null);

    if (fetchError) throw fetchError;

    const results = [];

    // 2. 각 포스트별로 최신 데이터 가져오기 (병렬 처리)
    for (const post of posts) {
      const videoId = getYouTubeVideoId(post.url);
      if (!videoId) continue;

      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${youtubeApiKey}`
      );
      const ytData = await ytRes.json();

      if (ytData.items && ytData.items.length > 0) {
        const stats = ytData.items[0].statistics;
        const views = parseInt(stats.viewCount) || 0;
        const likes = parseInt(stats.likeCount) || 0;
        const comments = parseInt(stats.commentCount) || 0;

        // 3. 현재 포스트 수치 업데이트
        await supabase
          .from('posts')
          .update({ views, likes, comments })
          .eq('id', post.id);

        // 4. 추이 기록 추가
        await supabase
          .from('post_metrics')
          .insert([{
            post_id: post.id,
            views,
            likes,
            comments
          }]);

        results.push({ id: post.id, status: 'updated' });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${results.length} posts updated.`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
