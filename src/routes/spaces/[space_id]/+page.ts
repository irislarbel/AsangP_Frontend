import type { PageLoad } from './$types';
import type { SpaceStatus, SpaceHistory, PeakResponse } from '$lib/types';

export const load: PageLoad = async ({ params, fetch, url }) => {
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
  
  const historyUrl = `/api/v1/spaces/${space_id}/history?target_date=${targetDate}`;
  const statusUrl = `/api/v1/spaces/${space_id}/status`;

  let status: SpaceStatus = {
    space_id: Number(space_id),
    space_name: "알 수 없는 공간",
    count: 0,
    result: "오류",
    last_update: null
  };
  
  let history: SpaceHistory = { target: [], comparison: [] };

  // 1. 실시간 상태 로드 (실패하더라도 기본 구조 유지)
  try {
    const statusRes = await fetch(statusUrl);
    if (statusRes.ok) {
      status = await statusRes.json();
    } else {
      console.warn('상태 API 로드 실패:', statusRes.status);
    }
  } catch (error) {
    console.error('상태 API 네트워크 에러:', error);
  }

  // 2. 히스토리 로드 (히스토리가 실패해도 status는 반환되어 화면에 이름이 유지됨)
  try {
    const historyRes = await fetch(historyUrl);
    if (historyRes.ok) {
      history = await historyRes.json();
    } else {
      console.warn('히스토리 API 로드 실패:', historyRes.status);
    }
  } catch (error) {
    console.error('히스토리 API 네트워크 에러:', error);
  }

  // 3. 피크 데이터 로드 (독립된 날짜)
  let peakDateStr = url.searchParams.get('peak_target_date');
  if (!peakDateStr) {
    // 기본값: 선택한 날짜(targetDate)와 동일하게 오늘(targetDate)로 설정
    peakDateStr = targetDate;
  }

  // 백엔드 API가 target_date를 포함하여 과거 7일을 반환하므로,
  // 6월 3일을 선택했을 때 5월 27일~6월 2일을 가져오기 위해 하루를 뺀 날짜로 API를 호출함
  const [py, pm, pd] = peakDateStr.split('-').map(Number);
  const apiDate = new Date(Date.UTC(py, pm - 1, pd));
  apiDate.setUTCDate(apiDate.getUTCDate() - 1);
  
  const apiYear = apiDate.getUTCFullYear();
  const apiMonth = String(apiDate.getUTCMonth() + 1).padStart(2, '0');
  const apiDay = String(apiDate.getUTCDate()).padStart(2, '0');
  const apiQueryDate = `${apiYear}-${apiMonth}-${apiDay}`;

  let peakData: PeakResponse | null = null;
  const peaksUrl = `/api/v1/spaces/${space_id}/peaks?target_date=${apiQueryDate}`;
  try {
    const peaksRes = await fetch(peaksUrl);
    if (peaksRes.ok) {
      peakData = await peaksRes.json();
    } else {
      console.warn('피크 API 로드 실패:', peaksRes.status);
    }
  } catch (error) {
    console.error('피크 API 네트워크 에러:', error);
  }

  return {
    status,
    history,
    peakData,
    peakDateStr
  };
};
