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
        metrics: metrics || []
      } 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
