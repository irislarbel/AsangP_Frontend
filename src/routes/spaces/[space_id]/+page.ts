import type { PageLoad } from './$types';
import type { SpaceStatus } from '$lib/types';
import { env } from '$env/dynamic/public';

export const load: PageLoad = async ({ params, fetch }) => {
  const { space_id } = params;
  const baseUrl = env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';
  
  // 실제 백엔드 API 주소 연결
  const API_URL = `${baseUrl}/api/v1/spaces/${space_id}/status`;

  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`백엔드 응답 에러: ${response.status} ${response.statusText}`);
    }
    
    const data: SpaceStatus = await response.json();
    return {
      status: data
    };
  } catch (error) {
    console.error('API 연결 실패:', error);
    
    // 연결 실패 시 사용자에게 알리기 위해 에러 데이터를 포함하여 반환
    return {
      status: {
        space_id: Number(space_id),
        space_name: "연결 오류",
        wifi_count: 0,
        bt_count: 0,
        last_update: null
      } as SpaceStatus,
      error: error instanceof Error ? error.message : '알 수 없는 에러'
    };
  }
};
