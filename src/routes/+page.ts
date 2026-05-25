import type { PageLoad } from './$types';
import type { SpaceStatus } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
  // 메인 화면에서 보여줄 4개 공간 ID (1, 2, 3, 4)
  const spaceIds = [1, 2, 3, 4];
  
  const fetchSpaceStatus = async (id: number) => {
    try {
      const response = await fetch(`/api/v1/spaces/${id}/status`);
      if (!response.ok) return null;
      return await response.json() as SpaceStatus;
    } catch (e) {
      console.error(`공간 ${id} 데이터 로드 실패:`, e);
      return null;
    }
  };

  // 4개 공간의 데이터를 병렬로 요청
  const results = await Promise.all(spaceIds.map(id => fetchSpaceStatus(id)));
  
  // 유효한 데이터만 필터링 (null 제외)
  const spaces = results.filter((s): s is SpaceStatus => s !== null);

  return {
    spaces
  };
};
