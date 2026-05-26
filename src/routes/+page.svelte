<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let { data }: { data: PageData } = $props();
  let spaces = $derived(data.spaces);

  function getStatusColor(level: number) {
    // 0 ~ 100 사이의 값을 0 ~ 1 비율로 변환
    const p = Math.max(0, Math.min(1, level / 100));
    
    // 하늘색 (Sky Blue): RGB(66, 165, 245)
    // 빨간색 (Red): RGB(239, 83, 80)
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

    // ECharts label의 완벽한 픽셀 단위 배치를 위한 설정 생성기
    function getLabelConfig(data: any) {
      const w = node.clientWidth || 200;
      const h = node.clientHeight || 300;
      const padX = w * 0.08;
      
      const nameFs = Math.max(24, w * 0.12); // 공간 이름 폰트 사이즈 키움 (기존 20, 0.09)
      const timeFs = Math.max(11, w * 0.04);
      const percentFs = Math.max(48, w * 0.22);
      const hintFs = Math.max(11, w * 0.04);

      const nameH = nameFs * 1.2;
      const timeH = timeFs * 1.2;
      const percentH = percentFs * 1.2;
      const hintH = hintFs * 1.2;

      const topPad = h * 0.08;
      // 중앙에 퍼센트가 오도록 중간 공백 계산
      const spaceBeforePercent = Math.max(0, (h / 2) - topPad - nameH - timeH - (percentH / 2));
      // 하단에 힌트가 오도록 하단 공백 계산 (기존 h*0.06에서 h*0.03으로 줄여 더 아래로 내림)
      const spaceBeforeHint = Math.max(0, h - topPad - nameH - timeH - spaceBeforePercent - percentH - hintH - (h * 0.03));

      const timeStr = data.last_update ? new Date(data.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

      return {
        show: true,
        color: '#1a202c',
        insideColor: '#ffffff',
        position: ['0%', '0%'], // 좌상단을 기준점으로 설정
        align: 'left',
        verticalAlign: 'top',
        formatter: `{name|${data.space_name}}\n{time|${timeStr} 업데이트}\n{spacer1|}\n{percent|${Math.round(data.congestion_level)}%}\n{spacer2|}\n{hint|눌러서 상세 분석 보기}`,
        rich: {
          name: { fontSize: nameFs, fontWeight: 900, padding: [topPad, 0, 0, padX], width: w - padX },
          time: { fontSize: timeFs, fontWeight: 400, padding: [16, 0, 0, padX], width: w - padX }, // 상단 여백(16)을 늘려서 공간 이름과 간격을 띄움
          spacer1: { height: spaceBeforePercent, width: w },
          percent: { fontSize: percentFs, fontWeight: 900, width: w, align: 'center' },
          spacer2: { height: spaceBeforeHint, width: w },
          hint: { fontSize: hintFs, fontWeight: 400, padding: [0, padX, 0, padX], width: w - padX * 2, align: 'right' }
        }
      };
    }

    Promise.all([
      import('echarts'),
      import('echarts-liquidfill')
    ]).then(([echarts]) => {
      chart = echarts.init(node);

      function updateChart() {
        const percent = Math.min(Math.max(currentData.congestion_level / 100, 0), 1);
        const c = getStatusColor(currentData.congestion_level);
        
        // 3개의 물결에 사용할 투명도 색상
        const color1 = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
        const color2 = `rgba(${c.r}, ${c.g}, ${c.b}, 0.6)`;
        const color3 = `rgba(${c.r}, ${c.g}, ${c.b}, 0.4)`;

        chart.setOption({
          series: [{
            type: 'liquidFill',
            // 세 번째 물결 추가: 현재 물결 높이의 절반(0.5배)
            data: [percent, percent * 0.9, percent * 0.5],
            color: [color1, color2, color3],
            shape: 'container',
            radius: '100%',
            center: ['50%', '50%'],
            amplitude: '8%',
            waveLength: '80%',
            outline: { show: false, borderDistance: 0 },
            backgroundStyle: { color: 'transparent' },
            itemStyle: { shadowBlur: 0 },
            label: getLabelConfig(currentData)
          }]
        });
      }

      updateChart();

      observer = new ResizeObserver(() => {
        chart.resize();
        chart.setOption({
          series: [{
            label: getLabelConfig(currentData)
          }]
        });
      });
      observer.observe(node);
    });

    return {
      update(newSpace: any) {
        currentData = newSpace;
        if (chart) {
          const percent = Math.min(Math.max(currentData.congestion_level / 100, 0), 1);
          const c = getStatusColor(currentData.congestion_level);
          
          const color1 = `rgba(${c.r}, ${c.g}, ${c.b}, 0.8)`;
          const color2 = `rgba(${c.r}, ${c.g}, ${c.b}, 0.6)`;
          const color3 = `rgba(${c.r}, ${c.g}, ${c.b}, 0.4)`;

          chart.setOption({
            series: [{
              data: [percent, percent * 0.9, percent * 0.5],
              color: [color1, color2, color3],
              label: getLabelConfig(currentData)
            }]
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

<div class="container">
  <header>
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
  :global(body) {
    background-color: #f5f7fa;
    margin: 0;
    font-family: 'Pretendard', sans-serif;
    height: 100dvh;
    overflow: hidden;
  }

  .container {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  header {
    background-color: #42a5f5;
    padding: 1.5rem 1rem;
    text-align: center;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  }

  h1 {
    color: #ffffff;
    margin: 0;
    margin-bottom: 0.25rem;
    font-size: 1.5rem;
    font-weight: 800;
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
    margin: 0;
  }

  .grid-wrapper {
    flex-grow: 1;
    min-height: 0;
    display: flex;
    justify-content: center;
    align-items: stretch;
    width: 100%;
    padding: 1rem;
    box-sizing: border-box;
  }

  .space-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 1rem;
    width: 100%;
    height: 100%;
  }

  @media (max-width: 600px) {
    .space-grid {
      grid-template-columns: 1fr;
      grid-template-rows: repeat(4, 1fr);
    }
  }

  .space-card {
    background: white;
    border-radius: 16px;
    text-decoration: none;
    color: inherit;
    position: relative; /* 중요: 내부 absolute의 기준점 */
    overflow: hidden;   /* 중요: 카드의 둥근 모서리(16px) 밖으로 물결이 튀어나가지 않게 자름 */
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
    position: absolute; /* 카드와 독립적으로 전체를 덮음 */
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0; /* 글자들보다 뒤에 배치 */
    pointer-events: none; /* 클릭을 방해하지 않음 */
  }

  .space-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
  }

  @media (min-width: 600px) {
    .container { padding: 1.5rem; }
    header { margin-bottom: 1.5rem; }
    h1 { font-size: 2rem; }
    .subtitle { font-size: 1rem; }
    .space-grid { gap: 1.5rem; }
  }
</style>
