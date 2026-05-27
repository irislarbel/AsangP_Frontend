<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let { data }: { data: PageData } = $props();
  let spaces = $derived(data.spaces);

  function getStatusColor(level: number) {
    const p = Math.max(0, Math.min(1, level / 100));
    const r = Math.round(66 + (239 - 66) * p);
    const g = Math.round(165 + (83 - 165) * p);
    const b = Math.round(245 + (80 - 245) * p);
    return { r, g, b };
  }

  function liquidChart(node: HTMLElement, space: any) {
    if (!browser) return;
    
    let chart: any;
    let observer: ResizeObserver;
    let currentData = space;

    function getSeriesConfig(data: any) {
      const w = node.clientWidth || 200;
      const h = node.clientHeight || 300;
      
      const nameFs = Math.min(40, Math.max(14, w * 0.11));
      const timeFs = Math.min(18, Math.max(10, w * 0.04));
      const percentFs = Math.min(60, Math.max(18, w * 0.25));
      const hintFs = Math.min(15, Math.max(10, w * 0.04));
      
      const padX = w * 0.08;
      const padY = h * 0.08;
      const timeStr = data.last_update ? new Date(data.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

      const percent = Math.min(Math.max(data.congestion_level / 100, 0), 1);
      const c = getStatusColor(data.congestion_level);
      const colors = [`rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`, `rgba(${c.r}, ${c.g}, ${c.b}, 0.6)`, `rgba(${c.r}, ${c.g}, ${c.b}, 0.4)`];

      // 공통 설정 (물결 모양, 색상 등)
      const baseSeries = {
        type: 'liquidFill',
        data: [percent, percent * 0.9, percent * 0.5],
        color: colors,
        shape: 'container',
        radius: '100%',
        amplitude: '8%',
        waveLength: '80%',
        outline: { show: false },
        backgroundStyle: { color: 'transparent' },
        itemStyle: { shadowBlur: 0 },
        silent: true // 레이블 외의 상호작용은 필요 없음
      };

      return [
        // 1. 배경 및 공간명/시간 레이어
        {
          ...baseSeries,
          silent: false,
          label: {
            show: true,
            position: [padX, padY],
            align: 'left',
            verticalAlign: 'top',
            color: '#1a202c',       // 루트 레벨에 추가
            insideColor: '#fff',   // 루트 레벨에 추가
            formatter: `{name|${data.space_name}}\n{time|${timeStr} 업데이트}`,
            rich: {
              name: { 
                fontSize: nameFs, 
                fontWeight: 900
              },
              time: { 
                fontSize: timeFs, 
                fontWeight: 400, 
                padding: [8, 0, 0, 0] 
              }
            }
          }
        },
        // 2. 정중앙 퍼센트 레이어 (독립적)
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
            insideColor: '#fff',
            formatter: `${Math.round(data.congestion_level)}%`
          }
        },
        // 3. 우하단 힌트 레이어 (독립적)
        {
          ...baseSeries,
          label: {
            show: true,
            position: [w - padX, h - padY],
            align: 'right',
            verticalAlign: 'bottom',
            fontSize: hintFs,
            fontWeight: 400,
            color: '#1a202c',
            insideColor: '#fff',
            formatter: '눌러서 상세 분석 보기'
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
        currentData = newSpace;
        if (chart) {
          chart.setOption({ series: getSeriesConfig(currentData) });
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
    <h1>AsangP Dashboard</h1>
    <p class="subtitle">실시간 공간 혼잡도 모니터링</p>
  </header>

  <div class="grid-wrapper">
    <div class="space-grid">
      {#each spaces as space}
        <a href="/spaces/{space.space_id}" class="space-card">
          <div class="chart-container" use:liquidChart={space}></div>
        </a>
      {/each}
    </div>
  </div>
</div>

<style>
  :global(html, body) {
    background-color: #f5f7fa;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    font-family: 'Pretendard', sans-serif;
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
    background-color: #42a5f5;
    padding: clamp(1rem, 3vw, 2.5rem) 1rem;
    text-align: center;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    border-radius: 0;
  }

  h1 {
    color: #ffffff;
    margin: 0;
    margin-bottom: 0.25rem;
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 800;
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.9);
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
    padding: 2vw 15vw 3vw 15vw;
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
    background: white;
    border-radius: 16px;
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    container-type: inline-size;
    padding: 0;
    margin: 0;
  }

  .chart-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
  }

  .space-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  }
</style>