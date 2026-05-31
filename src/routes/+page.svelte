<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  import { invalidate } from '$app/navigation';
  
  let { data }: { data: PageData } = $props();
  let spaces = $derived(data.spaces);

  onMount(() => {
    // 30초마다 데이터 새로고침
    const interval = setInterval(() => {
      invalidate(url => url.pathname.includes('/api/v1/spaces/'));
    }, 30000); 

    return () => clearInterval(interval);
  });

  function getStatusColor(level: number) {
    const p = Math.max(0, Math.min(1, level / 100));
    
    // 원본 색상 계산
    let r = Math.round(66 + (239 - 66) * p);
    let g = Math.round(165 + (83 - 165) * p);
    let b = Math.round(245 + (80 - 245) * p);

    // 채도 낮추기 (회색조와 혼합)
    const gray = (r + g + b) / 3;
    const saturation = 1.0; // 1.0은 원본, 0.0은 완전 흑백. 0.7로 낮춤.
    
    r = Math.round(gray * (1 - saturation) + r * saturation);
    g = Math.round(gray * (1 - saturation) + g * saturation);
    b = Math.round(gray * (1 - saturation) + b * saturation);
    
    return { r, g, b };
  }

  function liquidChart(node: HTMLElement, space: any) {
    if (!browser) return;
    
    let chart: any;
    let observer: ResizeObserver;
    let currentData = space;

    // space_id가 작아도 큰 차이를 만들기 위해 해시 시드 생성
    const hash = Math.abs(Math.sin(space.space_id) * 10000);
    const seed = hash % 1;
    
    const phaseOffset = seed * Math.PI * 2;
    const speedScale = 0.7 + (seed * 0.8); // 0.7배 ~ 1.5배로 속도 차이 확대
    const ampScale = 0.8 + (seed * 0.4);   // 진폭도 0.8배 ~ 1.2배로 다르게 설정

    function getSeriesConfig(data: any) {
      const w = node.clientWidth || 200;
      const h = node.clientHeight || 300;
      
      const nameFs = Math.min(35, Math.max(20, w * 0.11));
      const timeFs = Math.min(16, Math.max(12, w * 0.04));
      const percentFs = Math.min(55, Math.max(15, w * 0.20));
      const hintFs = Math.min(14, Math.max(11, w * 0.04));
      
      // 차트 내 여백 적응형 설정 (가로 비율 유지 + 세로 최소값 보장)
      const padX = Math.max(13, w * 0.03); // 최소 16px, 비율은 다시 6%로 (가로화면 대응)
      const padY = Math.max(16, h * 0.07); // 최소 16px, 비율 7%
      const spacing = Math.max(3, w * 0.01); // 최소 6px, 비율 2.5%
      
      const nameH = nameFs * 1.2;
      const timeStr = data.last_update ? new Date(data.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      
      // 화면 너비에 따른 진폭 보정 (좁을수록 진폭을 낮춤)
      const responsiveAmp = Math.max(0.4, Math.min(1, w / 400));

      const percent = Math.min(Math.max(data.congestion_level / 100, 0), 1);
const c = getStatusColor(data.congestion_level);
// 물결에만 투명도를 주어 뒤 배경이 비치게 함
const colors = [
  `rgba(${c.r}, ${c.g}, ${c.b}, 0.2)`,
  `rgba(${c.r}, ${c.g}, ${c.b}, 0.1)`,
  `rgba(${c.r}, ${c.g}, ${c.b}, 0.07)`
];

      const baseSeries = {
        type: 'liquidFill',
        // 반대 방향 물결을 섞어 제자리 상하 운동 효과(Standing Wave) 생성
        data: [
          { 
            value: percent, 
            period: 8000 * speedScale, 
            amplitude: `${10 * ampScale * responsiveAmp}%`, 
            phase: phaseOffset,
            direction: 'right'
          },
          { 
            value: percent * 0.99, 
            period: 9500 * speedScale, 
            amplitude: `${12 * ampScale * responsiveAmp}%`, 
            phase: phaseOffset + Math.PI / 2,
            direction: 'left' // 반대 방향
          },
          { 
            value: percent * 0.98, 
            period: 11000 * speedScale, 
            amplitude: `${8 * ampScale * responsiveAmp}%`, 
            phase: phaseOffset + Math.PI,
            direction: 'right'
          }
        ],
        color: colors,
        shape: 'container',
        radius: '100%',
        waveLength: '85%',
        outline: { 
          show: false 
        },
        backgroundStyle: { 
          color: 'transparent' 
        },
        itemStyle: { 
          shadowBlur: 0,
          shadowColor: 'transparent',
          opacity: 1 // 개별 데이터의 투명도가 우선함
        },
        silent: true,
        label: {
          fontFamily: '"Noto Sans KR", sans-serif'
        }
      };

      return [
        // 1. 장소 이름 레이어
        {
          ...baseSeries,
          silent: false,
          label: {
            show: true,
            position: [padX, padY],
            align: 'left',
            verticalAlign: 'top',
            fontSize: nameFs,
            fontWeight: 900,
            color: '#0A2240',      // 사용자 설정 색상 복구
            insideColor: '#f8f9fa',  // 사용자 설정 색상 복구
            formatter: data.space_name
          }
        },
        // 2. 업데이트 시간 레이어
        {
          ...baseSeries,
          label: {
            show: true,
            position: [padX, padY + nameH + spacing], // spacing 적용
            align: 'left',
            verticalAlign: 'top',
            fontSize: timeFs,
            fontWeight: 400,
            color: '#4a5568',
            insideColor: '#e2e8f0',
            formatter: `${timeStr} 업데이트`
          }
        },
        // 3. 정중앙 퍼센트 레이어
        {
          ...baseSeries,
          label: {
            show: true,
            position: ['50%', '50%'],
            align: 'center',
            verticalAlign: 'middle',
            fontSize: percentFs,
            fontWeight: 900,
            color: '#1a202c',
            insideColor: '#f8f9fa',
            formatter: `${Math.round(data.congestion_level)}%`
          }
        },
        // 4. 우하단 힌트 레이어
        {
          ...baseSeries,
          label: {
            show: true,
            position: [w - padX, h - padY],
            align: 'right',
            verticalAlign: 'bottom',
            fontSize: hintFs,
            fontWeight: 400,
            color: '#0A2240',
            insideColor: '#e2e8f0',
            formatter: '눌러서 상세 분석 보기',
            textBorderWidth: 0,
            textShadowBlur: 0
          }
        }
      ];
    }

    Promise.all([import('echarts'), import('echarts-liquidfill')]).then(([echarts]) => {
      chart = echarts.init(node);
      function updateChart() {
        chart.setOption({ series: getSeriesConfig(currentData) });
      }
      updateChart();
      observer = new ResizeObserver(() => {
        chart.resize();
        chart.setOption({ series: getSeriesConfig(currentData) });
      });
      observer.observe(node);
    });

    return {
      update(newSpace: any) {
        // 혼잡도 수준이나 이름이 실제로 바뀐 경우에만 업데이트 수행
        if (chart && (
          currentData.congestion_level !== newSpace.congestion_level || 
          currentData.space_name !== newSpace.space_name ||
          currentData.last_update !== newSpace.last_update
        )) {
          currentData = newSpace;
          chart.setOption({ 
            series: getSeriesConfig(currentData) 
          });
        }
      },
      destroy() {
        if (observer) observer.disconnect();
        if (chart) chart.dispose();
      }
    };
  }
</script>

<div class="dashboard-root">
  <header class="main-header">
    <div class="header-content">
      <a href="https://www.ajou.ac.kr" class="logo-link">
        <img src="/LandingPageBanner.png" alt="Logo" class="header-logo" />
        <span class="logo-text">아주대학교</span>
      </a>
      <div class="header-text">
        <h1>AsangP Dashboard</h1>
        <p class="subtitle">실시간 공간 혼잡도 모니터링</p>
      </div>
    </div>
  </header>

  <div class="grid-wrapper">
    <div class="space-grid">
      {#each spaces as space (space.space_id)}
        <a href="/spaces/{space.space_id}" class="space-card">
          <div class="chart-container" use:liquidChart={space}></div>
        </a>
      {/each}
    </div>
  </div>
</div>

<style>
  @font-face {
    font-family: 'AjouOTF';
    src: url('/fonts/AjouOTF.otf') format('opentype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: 'Noto Sans KR';
    src: url('/fonts/NotoSans-Regular.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }

  :global(html, body) {
    background-color: #f5f7fa;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    font-family: 'Noto Sans KR', sans-serif;
    overflow: hidden;
  }

  .dashboard-root {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: 0;
    margin: 0;
  }

  .main-header {
    background-color: #072e5d; /* 사용자 설정 배경색 유지 */
    padding: clamp(1rem, 1.5vw, 1.2rem) 5vw;
    display: flex;
    justify-content: center; /* 전체 내용(텍스트) 중앙 정렬 */
    align-items: center;
    flex-shrink: 0;
    width: 100%;
    position: relative; /* 로고 절대 배치의 기준점 */
    box-sizing: border-box;
    margin: 0;
    border-radius: 0;
  }

  .header-content {
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: center;
  }

  .logo-link {
    position: absolute;
    left: 5vw;
    top: 50%;
    transform: translateY(-40%);
    display: flex;
    align-items: center;
    gap: clamp(0.3rem, 1.2vw, 0.8rem);
    text-decoration: none;
  }

  .header-logo {
    height: clamp(2.5rem, 6.5vw, 4rem); /* 텍스트와 균형을 이루도록 소폭 조정 */
    width: auto;
    object-fit: contain;
  }

  .logo-text {
    font-family: 'AjouOTF', sans-serif;
    color: #dee2e6;
    font-size: clamp(1rem, 2.5vw, 1.5rem);
    font-weight: 10;
    white-space: nowrap;
  }

  .header-text {
    text-align: center; /* 텍스트 자체도 중앙 정렬 */
  }

  h1 {
    color: #ffffff;
    margin: 0;
    margin-bottom: 0.25rem;
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 800;
  }

  .subtitle {
    color: #dee2e6;
    font-size: clamp(0.8rem, 1.5vw, 1.1rem);
    margin: 0;
  }

  .grid-wrapper {
    flex-grow: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    margin: 0 auto;
    padding: 2vw 5vw 3vw 5vw;
    box-sizing: border-box;
  }

  .space-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 2vw;
    width: 100%;
    height: 100%;
  }

  .space-card {
    background: rgba(255, 255, 255, 0.7); /* 처음에 좋았던 반투명 수치 */
    backdrop-filter: blur(8px); /* 처음에 좋았던 블러 효과 */
    -webkit-backdrop-filter: blur(8px);
    border-radius: 16px;
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s;
    display: flex;
    width: 100%;
    height: 100%;
    container-type: inline-size;
    padding: 0;
    margin: 0;
  }

  .chart-container {
    position: absolute;
    top: -1px;
    left: -1px;
    width: calc(100% + 2px);
    height: calc(100% + 2px);
    z-index: 0;
    pointer-events: none;
  }

  .space-card:hover {
    transform: translateY(-2px);
  }
</style>