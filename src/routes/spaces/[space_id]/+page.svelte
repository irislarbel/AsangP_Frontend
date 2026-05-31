<script lang="ts">
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  
  let Line: any = $state(null);
  let { data }: { data: PageData } = $props();
  
  let status = $derived(data.status);
  let history = $derived(data.history);

  // 현재 선택된 날짜
  let selectedDate = $state(page.url.searchParams.get('target_date') || (function() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })());

  // 피크 분석 데이터 및 날짜
  let peakData = $derived(data.peakData);
  let peakDateStr = $derived(data.peakDateStr);

  function handleDateChange(e: Event) {
    const target = e.target as HTMLInputElement;
    selectedDate = target.value;
    const url = new URL(page.url);
    url.searchParams.set('target_date', selectedDate);
    goto(url.toString(), { keepFocus: true, noScroll: true });
  }

  function handlePeakDateChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const url = new URL(page.url);
    url.searchParams.set('peak_target_date', target.value);
    goto(url.toString(), { keepFocus: true, noScroll: true });
  }

  // Sparkline 공통 옵션
  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      zoom: { zoom: { enabled: false }, pan: { enabled: false } }
    },
    scales: {
      x: { display: false },
      y: { display: false, min: 0, max: 100 }
    },
    elements: {
      point: { radius: 0 }
    },
    layout: { padding: 0 }
  };

  // Sparkline 공통 라벨 (06:00 ~ 익일 05:00)
  const sparklineLabels = Array.from({ length: 24 }, (_, i) => {
    const h = (i + 6) % 24;
    return `${String(h).padStart(2, '0')}:00`;
  });

  // "HH:mm" 문자열을 해당 날짜의 실제 Date 객체의 타임스탬프(ms)로 변환
  // 00:00 ~ 05:50은 실질적으로 다음날 데이터이므로 날짜를 하루 더해줌
  function timeToTimestamp(timeStr: string, baseDate: string) {
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date(`${baseDate}T00:00:00`);
    
    if (h < 6) {
      dateObj.setDate(dateObj.getDate() + 1);
    }
    
    dateObj.setHours(h, m, 0, 0);
    return dateObj.getTime();
  }

  onMount(async () => {
    if (browser) {
      const chartJSMod = await import('chart.js');
      // time 스케일을 위해 date-fns 어댑터 로드 필수
      await import('chartjs-adapter-date-fns');
      const chartMod = await import('svelte-chartjs');
      const zoomPluginMod = await import('chartjs-plugin-zoom');
      
      const {
        Chart: ChartJS, Title, Tooltip, Legend, LineElement, LinearScale, PointElement, TimeScale, Filler
      } = chartJSMod;

      // CategoryScale 대신 TimeScale 사용
      ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, TimeScale, Filler, zoomPluginMod.default);
      Line = chartMod.Line;
    }
  });

  let hasData = $derived(
    (history.target && history.target.length > 0) || 
    (history.comparison && history.comparison.length > 0)
  );

  // x축을 time scale로 처리하기 위해 실제 타임스탬프(ms)를 x값으로 주입
  let chartData = $derived({
    datasets: [
      {
        label: `${selectedDate} (대상일)`,
        data: (history.target || []).map(p => ({ x: timeToTimestamp(p.time, selectedDate), y: p.congestion_level })),
        fill: true,
        borderColor: '#ff3e00',
        backgroundColor: 'rgba(255, 62, 0, 0.1)',
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: '7일 전 비교',
        // 겹쳐서 비교하기 위해 x축은 타겟 날짜(selectedDate)를 기준으로 생성
        data: (history.comparison || []).map(p => ({ x: timeToTimestamp(p.time, selectedDate), y: p.congestion_level })),
        fill: false,
        borderColor: '#cbd5e0',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0
      }
    ]
  });

  // x축 min, max 계산 (해당 날짜 06:00 부터 다음날 05:50 까지)
  let xAxisMin = $derived(new Date(`${selectedDate}T06:00:00`).getTime());
  let xAxisMax = $derived((() => {
    const maxDate = new Date(`${selectedDate}T05:50:00`);
    maxDate.setDate(maxDate.getDate() + 1);
    return maxDate.getTime();
  })());

  let chartOptions = $derived({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (items: any) => {
            const date = new Date(items[0].parsed.x);
            return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          },
          label: (context: any) => {
            // 혼잡도를 퍼센트로 표시
            return `${context.dataset.label}: ${Math.round(context.parsed.y)}%`;
          }
        }
      },
      zoom: {
        pan: { enabled: true, mode: 'x' as const },
        zoom: {
          wheel: { enabled: true, speed: 0.1 },
          pinch: { enabled: true },
          mode: 'x' as const,
        },
        limits: {
          x: { 
            min: xAxisMin, 
            max: xAxisMax, 
            minRange: 10800000 
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        title: { display: false },
        ticks: { display: false } // Y축 숫자 숨김
      },
      x: {
        type: 'time' as const,
        min: xAxisMin,
        max: xAxisMax,
        time: {
          displayFormats: {
            hour: 'HH:mm',
            minute: 'HH:mm'
          },
          tooltipFormat: 'HH:mm'
        },
        grid: { display: false },
        ticks: {
          source: 'data',
          autoSkip: true,
          maxRotation: 0,
        }
      }
    }
  });

  // 혼잡도 수치를 상태 색상으로 변환하는 헬퍼 함수
  function getStatusColor(level: number) {
    const p = Math.max(0, Math.min(1, level / 100));
    const r = Math.round(66 + (239 - 66) * p);
    const g = Math.round(165 + (83 - 165) * p);
    const b = Math.round(245 + (80 - 245) * p);
    return `rgb(${r}, ${g}, ${b})`;
  }
</script>

<div class="container">
  <nav>
    <a href="/">&larr; 대시보드로 돌아가기</a>
  </nav>

  <header>
    <div class="header-main">
      <h1>{status.space_name} <span class="id">ID: {status.space_id}</span></h1>
      <div class="date-picker">
        <label for="date">날짜 선택:</label>
        <input type="date" id="date" value={selectedDate} onchange={handleDateChange} />
      </div>
    </div>
    <div class="current-status">
      <span class="status-tag" style:background-color={getStatusColor(status.congestion_level)}>
        {Math.round(status.congestion_level)}%
      </span>
      <span class="last-sync">실시간 업데이트: {status.last_update ? new Date(status.last_update).toLocaleString() : '-'}</span>
    </div>
  </header>

  <div class="chart-section">
    <div class="chart-header">
      <h2>전번 주 대비 혼잡도 분석</h2>
      <p>마우스 휠로 <strong>확대/축소</strong>, 드래그로 <strong>좌우 이동</strong>이 가능합니다.</p>
    </div>
    <div class="chart-container">
      {#if Line}
        <div class="chart-wrapper">
           <Line data={chartData} options={chartOptions} />
        </div>
        {#if !hasData}
          <div class="no-data-overlay">
            해당 날짜의 데이터가 없습니다.
          </div>
        {/if}
      {:else}
        <p class="loading-chart">분석 차트 로드 중...</p>
      {/if}
    </div>
    <div class="chart-footer">
      * 데이터가 없는 시간대는 0으로 자동 보정되어 표시됩니다. (06:00 ~ 익일 05:50)
    </div>
  </div>
  
  <div class="table-section">
    <div class="table-header">
      <h2>과거 7일 피크 시간대</h2>
      <div class="date-picker">
        <label for="peakDate">기준 날짜:</label>
        <input type="date" id="peakDate" value={peakDateStr} onchange={handlePeakDateChange} />
      </div>
    </div>
    
    <div class="table-container">
      {#if peakData && peakData.data && peakData.data.length > 0}
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>피크 시간대 (70% 이상)</th>
              <th>일간 추세</th>
            </tr>
          </thead>
          <tbody>
            {#each peakData.data as pd}
              <tr>
                <td>{pd.date}</td>
                <td>
                  {#if pd.peak_ranges && pd.peak_ranges.length > 0}
                    <div class="peak-badges">
                      {#each pd.peak_ranges as pr}
                        <span class="peak-badge">{pr}</span>
                      {/each}
                    </div>
                  {:else}
                    <span class="no-peak">혼잡 시간대 없음 <small>(최고 {pd.max_congestion}%)</small></span>
                  {/if}
                </td>
                <td class="sparkline-cell">
                  {#if Line}
                    <div class="sparkline-wrapper">
                      <Line 
                        data={{
                          labels: sparklineLabels,
                          datasets: [{
                            data: pd.daily_trend,
                            borderColor: '#3b82f6',
                            borderWidth: 2,
                            tension: 0.3,
                            spanGaps: false
                          }]
                        }} 
                        options={sparklineOptions} 
                      />
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="loading-table">데이터를 불러오거나 백엔드 API가 준비되지 않았습니다.</p>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(body) {
    background-color: #f8fafc;
    margin: 0;
    color: #1a202c;
  }

  .container {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  nav { margin-bottom: 1.5rem; }
  nav a { text-decoration: none; color: #4a5568; font-weight: 600; font-size: 0.9rem; }

  header {
    background: white;
    padding: 1.5rem 2rem;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
  }

  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  h1 { margin: 0; font-size: 1.75rem; }
  .id { font-size: 0.9rem; color: #a0aec0; font-weight: normal; }

  .date-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .date-picker input {
    padding: 0.4rem 0.8rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #2d3748;
    font-family: inherit;
  }

  .current-status {
    margin-top: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-top: 1px solid #f1f5f9;
    padding-top: 1rem;
  }

  .status-tag {
    padding: 0.2rem 0.8rem;
    border-radius: 99px;
    color: white;
    font-weight: bold;
    font-size: 0.85rem;
  }

  .last-sync { color: #94a3b8; font-size: 0.8rem; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1.25rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    padding: 1.25rem;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    text-align: center;
  }

  .stat-card .label { display: block; color: #64748b; font-size: 0.85rem; margin-bottom: 0.4rem; }
  .stat-card .value { font-size: 1.25rem; font-weight: 800; }
  .stat-card .value.main { color: #ff3e00; font-size: 1.75rem; }

  .chart-section {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .chart-header h2 { margin: 0; font-size: 1.15rem; color: #1e293b; }
  .chart-header p { margin: 0.4rem 0 1.5rem 0; color: #64748b; font-size: 0.85rem; }

  .chart-container {
    height: 400px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: crosshair;
  }

  .chart-wrapper {
    width: 100%;
    height: 100%;
  }

  .no-data-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    color: #4a5568;
    pointer-events: none;
    z-index: 10;
  }

  .chart-footer {
    margin-top: 1rem;
    font-size: 0.75rem;
    color: #94a3b8;
    text-align: right;
  }

  .loading-chart { color: #94a3b8; font-style: italic; }

  /* Table Section Styles */
  .table-section {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    margin-top: 2rem;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .table-header h2 { margin: 0; font-size: 1.15rem; color: #1e293b; }

  .table-container {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    min-width: 500px;
  }

  th, td {
    padding: 1rem;
    border-bottom: 1px solid #f1f5f9;
  }

  th {
    color: #64748b;
    font-weight: 600;
    font-size: 0.9rem;
  }

  td {
    color: #334155;
    vertical-align: middle;
  }

  .peak-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .peak-badge {
    background-color: #fee2e2;
    color: #ef4444;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .no-peak {
    color: #10b981;
    font-weight: 500;
  }
  
  .no-peak small {
    color: #64748b;
    font-weight: normal;
  }

  .sparkline-cell {
    width: 150px;
  }

  .sparkline-wrapper {
    width: 150px;
    height: 40px;
  }
  
  .loading-table {
    text-align: center;
    color: #94a3b8;
    padding: 2rem 0;
  }
</style>
