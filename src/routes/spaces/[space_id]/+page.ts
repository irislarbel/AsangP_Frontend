import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
  const { space_id } = params;
  
  // 서비스 개시일 (기준점)
  const SERVICE_LAUNCH_DATE = '2026-06-04';

  // KST 기준으로 오늘 날짜(YYYY-MM-DD) 계산
  const now = new Date();
  const kstTime = now.getTime() + (9 * 60 * 60 * 1000);
  const kstDate = new Date(kstTime);
  const y = kstDate.getUTCFullYear();
  const m = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kstDate.getUTCDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  // 날짜 파라미터 가져오기 및 유효성/범위 검증
  let originalTargetDate = url.searchParams.get('target_date');
  let targetDate = originalTargetDate;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!targetDate || !dateRegex.test(targetDate)) {
    targetDate = todayStr;
  } else {
    // URL 임의 조작 방지: 미래 또는 서비스 개시일 이전으로 이동 차단
    if (targetDate > todayStr) targetDate = todayStr;
    if (targetDate < SERVICE_LAUNCH_DATE) targetDate = SERVICE_LAUNCH_DATE;
  }

  // 피크 날짜 파라미터 가져오기 및 유효성/범위 검증
  let originalPeakDateStr = url.searchParams.get('peak_target_date');
  let peakDateStr = originalPeakDateStr;
  if (!peakDateStr || !dateRegex.test(peakDateStr)) {
    peakDateStr = targetDate;
  } else {
    if (peakDateStr > todayStr) peakDateStr = todayStr;
    if (peakDateStr < SERVICE_LAUNCH_DATE) peakDateStr = SERVICE_LAUNCH_DATE;
  }

  // 값이 교정되었다면 강제로 정상 URL로 리다이렉트
  if (targetDate !== originalTargetDate || peakDateStr !== originalPeakDateStr) {
    const newUrl = new URL(url);
    newUrl.searchParams.set('target_date', targetDate);
    newUrl.searchParams.set('peak_target_date', peakDateStr);
    throw redirect(302, newUrl.pathname + newUrl.search);
  }

  // 이제 데이터 패칭은 Svelte 컴포넌트 측(클라이언트)에서 수행합니다.
  return {
    space_id: Number(space_id),
    targetDate,
    peakDateStr
  };
};
