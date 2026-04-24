import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  const { nextRun } = await req.json();
  console.log("Triggering Pulse60 metrics update at:", nextRun);

  // 현재 배포된 사이트의 URL을 환경 변수에서 가져오거나 상대 경로로 호출 시도
  // Netlify Functions에서는 절대 경로가 필요할 수 있습니다.
  const siteUrl = process.env.URL || 'http://localhost:3000';
  
  try {
    const res = await fetch(`${siteUrl}/api/cron/update-metrics`);
    const data = await res.json();
    console.log("Update success:", data);
  } catch (err) {
    console.error("Update failed:", err);
  }
};

export const config: Config = {
  schedule: "*/5 * * * *"
};
