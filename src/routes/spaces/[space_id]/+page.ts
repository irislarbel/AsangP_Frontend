import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
  const { space_id } = params;
  
  // URL에서 날짜를 가져오되, 없으면 오늘 날짜(KST 기준)를 기본값으로 사용
  let targetDate = url.searchParams.get('target_date');
  if (!targetDate) {
    const kstStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" });
    const now = new Date(kstStr);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    targetDate = `${year}-${month}-${day}`;
  }
  
  // 피크 날짜 가져오기 (기본값은 메인 차트 날짜)
  let peakDateStr = url.searchParams.get('peak_target_date');
  if (!peakDateStr) {
    peakDateStr = targetDate;
  }

  // 이제 데이터 패칭은 Svelte 컴포넌트 측(클라이언트)에서 수행합니다.
  return {
    space_id: Number(space_id),
    targetDate,
    peakDateStr
  };
};
