const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function updateAuthors() {
  console.log('🚀 Starting author update script...');

  // 1. Fetch all posts with missing or generic author
  const { data: posts, error: fetchError } = await supabase
    .from('posts')
    .select('id, url, platform, author')
    .or('author.is.null,author.eq.Unknown Author,author.eq.YouTube Creator');

  if (fetchError) {
    console.error('❌ Error fetching posts:', fetchError);
    return;
  }

  if (!posts || posts.length === 0) {
    console.log('✅ All posts already have authors or no posts found.');
    return;
  }

  console.log(`🔍 Found ${posts.length} posts to update.`);

  for (const post of posts) {
    let author = post.author;

    if (post.platform === 'youtube') {
      const videoId = getYouTubeVideoId(post.url);
      if (videoId && youtubeApiKey) {
        try {
          console.log(`   Fetching data for YouTube video: ${videoId}`);
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`);
          const data = await res.json();
          
          if (data.items && data.items.length > 0) {
            author = data.items[0].snippet.channelTitle;
            console.log(`   ✅ Found author: ${author}`);
          }
        } catch (err) {
          console.error(`   ❌ Failed to fetch YouTube data for ${videoId}:`, err);
        }
      }
    } else if (post.platform === 'instagram') {
      // For Instagram, we might just set a generic one if we can't scrape it easily
      author = 'Instagram Post';
    }

    if (author && author !== post.author) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ author })
        .eq('id', post.id);

      if (updateError) {
        console.error(`   ❌ Failed to update post ${post.id}:`, updateError);
      } else {
        console.log(`   ✨ Updated post ${post.id} with author: ${author}`);
      }
    }
  }

  console.log('🏁 Author update complete!');
}

updateAuthors();
