const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const postId = 'addea919-ea24-453f-8358-143851948db2';

async function seedMetrics() {
  const now = new Date();
  const metrics = [];
  
  for (let i = 10; i >= 1; i--) {
    const time = new Date(now.getTime() - i * 30 * 60 * 1000);
    metrics.push({
      post_id: postId,
      views: 10000 + (10 - i) * 500 + Math.floor(Math.random() * 200),
      likes: 500 + (10 - i) * 20 + Math.floor(Math.random() * 5),
      comments: 50 + (10 - i) * 2 + Math.floor(Math.random() * 2),
      recorded_at: time.toISOString()
    });
  }

  const { error } = await supabase.from('post_metrics').insert(metrics);
  if (error) console.error('Error seeding metrics:', error);
  else console.log('Successfully seeded 10 metric points!');
}

seedMetrics();
