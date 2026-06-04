<script lang="ts">
  import type { PageData } from './$types';
  import type { SpaceStatus, SpaceHistory, PeakResponse } from '$lib/types';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Header from '$lib/components/Header.svelte';
  
  import flatpickr from 'flatpickr';
  import 'flatpickr/dist/flatpickr.css';
  import { Korean } from 'flatpickr/dist/l10n/ko.js';
  
  let Line: any = $state(null);
  let { data }: { data: PageData } = $props();
  let space_id = $derived(data.space_id);
  
  let status: SpaceStatus = $state({
    space_id: space_id,
    space_name: "알 수 없는 공간",
    count: 0,
    result: "로딩 중...",
    last_update: null
  });
  let history: SpaceHistory = $state({ target: [], comparison: [] });
  let peakData: PeakResponse | null = $state(null);

  let isChartLoading = $state(true);
  let isTableLoading = $state(true);

  // 현재 선택된 날짜 (URL에서 주입)
  let selectedDate = $state(data.targetDate);
  let peakDateStr = $state(data.peakDateStr);
  
  // 차트 렌더링 시점에 사용할 날짜 (데이터 로딩 완료 후 동기화)
  let chartDisplayedDate = $state(data.targetDate);

  // URL 변경 시 로컬 상태 동기화
  $effect(() => {
    selectedDate = data.targetDate;
  });
  $effect(() => {
    peakDateStr = data.peakDateStr;
  });

  // 메인 차트 독립 페칭 (selectedDate 기반)
  $effect(() => {
    let active = true;
    const fetchMainData = async () => {
      isChartLoading = true;
      const statusUrl = `/api/v1/spaces/${space_id}/status`;
      const historyUrl = `/api/v1/spaces/${space_id}/history?target_date=${selectedDate}`;

      const [statusRes, historyRes] = await Promise.all([
        fetch(statusUrl).then(res => res.ok ? res.json() : null).catch(() => null),
        fetch(historyUrl).then(res => res.ok ? res.json() : null).catch(() => null)
      ]);

      if (!active) return;
      if (statusRes) status = statusRes;
      if (historyRes) {
        history = historyRes;
        chartDisplayedDate = selectedDate; // 새 데이터를 받았을 때 차트 기준 날짜 갱신
      }
      isChartLoading = false;
    };
    fetchMainData();
    return () => { active = false; };
  });

  // 하단 표 독립 페칭 (peakDateStr 기반)
  $effect(() => {
    let active = true;
    const fetchPeakData = async () => {
      isTableLoading = true;

      const [py, pm, pd] = peakDateStr.split('-').map(Number);
      const apiDate = new Date(Date.UTC(py, pm - 1, pd));
      apiDate.setUTCDate(apiDate.getUTCDate() - 1);
      
      const apiYear = apiDate.getUTCFullYear();
      const apiMonth = String(apiDate.getUTCMonth() + 1).padStart(2, '0');
      const apiDay = String(apiDate.getUTCDate()).padStart(2, '0');
      const apiQueryDate = `${apiYear}-${apiMonth}-${apiDay}`;
      
      const peaksUrl = `/api/v1/spaces/${space_id}/peaks?target_date=${apiQueryDate}`;
      const peaksRes = await fetch(peaksUrl).then(res => res.ok ? res.json() : null).catch(() => null);

      if (!active) return;
      if (peaksRes) peakData = peaksRes;
      isTableLoading = false;
    };
    fetchPeakData();
    return () => { active = false; };
  });

  // Sparkline 공통 옵션 (상단 메인 차트와 동일한 TimeScale 사용)
  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // 스파크라인 차트는 애니메이션 비활성화로 성능 최적화
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      zoom: {
        pan: { enabled: false },
        zoom: {
          wheel: { enabled: false },
          pinch: { enabled: false },
          drag: { enabled: false }
        }
      }
    },
    scales: {
      x: { 
        type: 'time' as const,
        display: false 
      },
      y: { display: false, min: 0, max: 100 }
    },
    elements: {
      point: { radius: 0 }
    },
    layout: { 
      padding: { top: 2, bottom: 2 } // Y축 0에서 선이 캔버스 밖으로 잘려서 얇아 보이는 현상 방지
    }
  };

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

  // Sparkline 데이터 생성 헬퍼 함수 (상단 차트처럼 타임스탬프 변환)
  function getSparklineData(trend: (number | null)[], baseDate: string) {
    const dataPoints = (trend || []).map((val, i) => {
      const h = (i + 6) % 24;
      const timeStr = `${String(h).padStart(2, '0')}:00`;
      return {
        x: timeToTimestamp(timeStr, baseDate),
        y: val ?? 0
      };
    });

    return {
      datasets: [{
        data: dataPoints,
        borderColor: '#072e5d',
        borderWidth: 1, // 얇은 굵기로 통일
        tension: 0.3,
        spanGaps: true
      }]
    };
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
        label: `${chartDisplayedDate} (대상일)`,
        data: (history.target || []).map(p => ({ x: timeToTimestamp(p.time, chartDisplayedDate), y: p.congestion_level })),
        fill: true,
        borderColor: '#072e5d',
        backgroundColor: 'rgba(7, 46, 93, 0.1)',
        borderWidth: 1,
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: '7일 전 비교',
        // 겹쳐서 비교하기 위해 x축은 타겟 날짜(chartDisplayedDate)를 기준으로 생성
        data: (history.comparison || []).map(p => ({ x: timeToTimestamp(p.time, chartDisplayedDate), y: p.congestion_level })),
        fill: false,
        borderColor: '#cbd5e0', // 다시 회색 계열로 변경
        borderWidth: 1,
        tension: 0.4,
        pointRadius: 0
      }
    ]
  });

  // x축 min, max 계산 (해당 날짜 06:00 부터 다음날 05:50 까지)
  let xAxisMin = $derived(new Date(`${chartDisplayedDate}T06:00:00`).getTime());
  let xAxisMax = $derived((() => {
    const maxDate = new Date(`${chartDisplayedDate}T06:00:00`);
    maxDate.setDate(maxDate.getDate() + 1);
    return maxDate.getTime();
  })());

  let chartOptions = $derived({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
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
        max: 100,
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

  // 날짜 문자열 포맷팅 헬퍼 함수
  function formatDateString(dateStr: string) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
    }
    return dateStr;
  }

  // 커스텀 날짜 선택기용 로직 (서버 위치인 한국 시간 KST 기준)
  const getKstDateStr = (offsetDays = 0) => {
    const kstStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" });
    const d = new Date(kstStr);
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getKstDateStr(0);
  const yesterdayStr = getKstDateStr(-1);

  // 서비스 개시일 (과거 이동 제한의 기준점)
  const SERVICE_LAUNCH_DATE = '2026-06-04';

  const minDateStr = SERVICE_LAUNCH_DATE; // 메인 차트: 서비스 개시일 이전으로 이동 불가

  // Flatpickr 커스텀 달력 액션
  function customDatePicker(node: HTMLElement, { defaultDate, minDate, maxDate, onDateSelect }: any) {
    const fp = flatpickr(node, {
      locale: Korean,
      defaultDate,
      minDate,
      maxDate,
      disableMobile: true, // 모바일 네이티브 달력 무시하고 강제로 커스텀 UI 띄움
      onChange: (selectedDates, dateStr) => {
        onDateSelect(dateStr);
      }
    });

    return {
      update(newOpts: any) {
        fp.set('minDate', newOpts.minDate);
        fp.set('maxDate', newOpts.maxDate);
        fp.setDate(newOpts.defaultDate, false);
      },
      destroy() {
        fp.destroy();
      }
    };
  }

  let isNextDisabled = $derived(selectedDate >= todayStr);
  let isPrevDisabled = $derived(selectedDate <= minDateStr);

  function goPrevDay() {
    if (isPrevDisabled) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    updateSelectedDate(dateObj);
  }

  function goNextDay() {
    if (isNextDisabled) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    updateSelectedDate(dateObj);
  }

  function updateSelectedDate(dateObj: Date) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    selectedDate = `${y}-${m}-${d}`;
    
    const url = new URL(page.url);
    url.searchParams.set('target_date', selectedDate);
    goto(url.toString(), { keepFocus: true, noScroll: true });
  }

  // 하단 피크 표 날짜 제한: 미래는 오늘까지, 과거는 서비스 개시일까지
  const maxPeakDateStr = todayStr;
  const minPeakDateStr = SERVICE_LAUNCH_DATE;

  let isNextPeakDisabled = $derived(peakDateStr >= maxPeakDateStr);
  let isPrevPeakDisabled = $derived(peakDateStr <= minPeakDateStr);

  function goPrevPeakDay() {
    if (isPrevPeakDisabled) return;
    const [y, m, d] = peakDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    updatePeakDate(dateObj);
  }

  function goNextPeakDay() {
    if (isNextPeakDisabled) return;
    const [y, m, d] = peakDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    updatePeakDate(dateObj);
  }

  function updatePeakDate(dateObj: Date) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const newPeakDate = `${y}-${m}-${d}`;
    
    const url = new URL(page.url);
    url.searchParams.set('peak_target_date', newPeakDate);
    goto(url.toString(), { keepFocus: true, noScroll: true });
  }

  function formatDateVerbose(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const day = dayNames[dateObj.getDay()];
    
    return m + "월 " + d + "일 (" + day + ")";
  }
</script>

<div class="page-wrapper">
  <Header />

<div class="container">
  <nav>
    <a href="/">&larr; 대시보드로 돌아가기</a>
  </nav>



  <div class="content-grid">
    <div class="chart-section">
      <div class="chart-header">
        <div class="chart-title-row">
          <div class="title-with-status">
            <h2>{status.space_name} 혼잡도 차트</h2>
            <span class="status-tag" style:background-color={getStatusColor(status.congestion_level)}>
              {Math.round(status.congestion_level)}%
            </span>
          </div>
          <div class="custom-date-picker">
            <button class="nav-arrow" disabled={isPrevDisabled} onclick={goPrevDay} aria-label="이전 날짜">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            
            <div class="date-badge-wrapper">
              <input type="text" id="date" class="hidden-date-input" 
                use:customDatePicker={{
                  defaultDate: selectedDate, 
                  minDate: minDateStr, 
                  maxDate: todayStr, 
                  onDateSelect: (d) => {
                    selectedDate = d;
                    const url = new URL(page.url);
                    url.searchParams.set('target_date', selectedDate);
                    goto(url.toString(), { keepFocus: true, noScroll: true });
                  }
                }} 
              />
              <div class="date-badge">
                <img src="/calendar-icon.svg" alt="calendar" class="calendar-icon" />
                <span>{formatDateVerbose(selectedDate)}</span>
                <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>

            <button class="nav-arrow" disabled={isNextDisabled} onclick={goNextDay} aria-label="다음 날짜">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
        <p>차트를 드래그하거나, <strong>확대/축소</strong>하여 원하는 시간대를 상세히 확인해 보세요.</p>
      </div>
    <div class="chart-container">
      {#if Line}
        <div class="chart-wrapper">
           <Line data={chartData} options={chartOptions} />
        </div>
        {#if isChartLoading}
          <div class="loading-overlay">
            <div class="spinner"></div>
          </div>
        {:else if !hasData}
          <div class="no-data-overlay">
            해당 날짜의 데이터가 없습니다.
          </div>
        {/if}
      {:else}
        <p class="loading-chart">분석 차트 로드 중...</p>
      {/if}
    </div>

  </div>
  
  <div class="table-section">
    <div class="table-header">
      <h2>주간 혼잡도 추이</h2>
      <div class="custom-date-picker">
        <button class="nav-arrow" disabled={isPrevPeakDisabled} onclick={goPrevPeakDay} aria-label="이전 날짜">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        
        <div class="date-badge-wrapper">
          <input type="text" id="peakDate" class="hidden-date-input" 
            use:customDatePicker={{
              defaultDate: peakDateStr, 
              minDate: minPeakDateStr, 
              maxDate: maxPeakDateStr, 
              onDateSelect: (d) => {
                const url = new URL(page.url);
                url.searchParams.set('peak_target_date', d);
                goto(url.toString(), { keepFocus: true, noScroll: true });
              }
            }} 
          />
          <div class="date-badge">
            <img src="/calendar-icon.svg" alt="calendar" class="calendar-icon" />
            <span>{formatDateVerbose(peakDateStr)}</span>
            <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        <button class="nav-arrow" disabled={isNextPeakDisabled} onclick={goNextPeakDay} aria-label="다음 날짜">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>
    
    <div class="table-container">
      {#if isTableLoading}
        <div class="loading-overlay">
          <div class="spinner"></div>
        </div>
      {/if}

      {#if peakData && peakData.data && peakData.data.length > 0}
        <table>
          <tbody>
            {#each peakData.data as pd}
              <tr>
                <td style="white-space: nowrap;">{formatDateString(pd.date)}</td>
                <td>
                  {#if pd.peak_ranges && pd.peak_ranges.length > 0}
                    <div class="peak-badges">
                      {#each pd.peak_ranges as pr}
                        <span class="peak-text">{pr}</span>
                      {/each}
                    </div>
                  {:else}
                    <span class="no-peak">대체로 한산한 편 <small>(최고 {pd.max_congestion ?? 0}%)</small></span>
                  {/if}
                </td>
                <td class="sparkline-cell">
                  {#if Line}
                    <div class="sparkline-wrapper">
                      <Line 
                        data={getSparklineData(pd.daily_trend, pd.date)} 
                        options={sparklineOptions} 
                      />
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if !isTableLoading}
        <p class="loading-table">해당 날짜의 데이터가 없습니다.</p>
      {/if}
    </div>
  </div>
</div>
</div>
</div>

<style>
  .page-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: #f5f7fa;
  }

  .container {
    max-width: 1600px;
    width: 100%;
    box-sizing: border-box;
    margin: 1.5rem auto;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    flex-grow: 1;
    min-height: 0;
  }

  @media (min-width: 1024px) {
    .page-wrapper {
      height: 100vh;
      overflow: hidden;
    }
    .container {
      min-height: 0;
    }
    .content-grid {
      grid-template-columns: 55fr 45fr; /* 5.5:4.5 비율로 배치 */
    }
  }

  nav { margin-bottom: 1.5rem; }
  nav a { text-decoration: none; color: #4a5568; font-weight: 600; font-size: 0.9rem; }

  .title-with-status {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .status-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.8rem; /* line-height가 줄어든 만큼 상하 패딩을 늘려 기존 뱃지 높이 유지 */
    border-radius: 99px;
    color: white;
    font-weight: bold;
    font-size: 0.85rem;
    line-height: 1; /* 텍스트 렌더링에 의한 상하 여백을 없애 뱃지 내부의 완벽한 중앙 정렬 달성 */
  }

  /* 커스텀 날짜 선택기(뱃지 스타일) CSS */
  .custom-date-picker {
    display: flex;
    align-items: center;
    gap: clamp(0.2rem, 1vw, 0.5rem);
  }

  .nav-arrow {
    background: none;
    border: none;
    cursor: pointer;
    padding: clamp(0.2rem, 1vw, 0.4rem);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4a5568;
    border-radius: 50%;
    transition: background-color 0.2s, color 0.2s;
  }
  
  .nav-arrow svg {
    width: clamp(1rem, 2.5vw, 1.2rem);
    height: clamp(1rem, 2.5vw, 1.2rem);
  }

  .nav-arrow:hover:not(:disabled) {
    background-color: #edf2f7;
    color: #2d3748;
  }

  .nav-arrow:disabled {
    color: #cbd5e0;
    cursor: not-allowed;
  }

  .date-badge-wrapper {
    position: relative;
    display: inline-block;
  }

  .hidden-date-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    border: none;
    box-sizing: border-box;
    opacity: 0;
    cursor: pointer;
    z-index: 2;
    font-size: 16px; /* 모바일(iOS Safari) 자동 확대 방지 */
  }

  .date-badge {
    display: flex;
    align-items: center;
    gap: clamp(0.2rem, 1vw, 0.4rem);
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: clamp(0.3rem, 1.5vw, 0.5rem) clamp(0.6rem, 2vw, 1rem);
    border-radius: 99px;
    color: #334155;
    font-weight: 600;
    font-size: clamp(0.8rem, 2vw, 0.95rem);
    position: relative;
    z-index: 1;
    transition: background-color 0.2s, border-color 0.2s;
  }
  
  .date-badge-wrapper:hover .date-badge {
    background-color: #f1f5f9;
    border-color: #cbd5e0;
  }

  .calendar-icon {
    width: clamp(0.9rem, 2vw, 1.1rem);
    height: clamp(0.9rem, 2vw, 1.1rem);
    opacity: 0.7;
  }

  .dropdown-icon {
    margin-left: 0.1rem;
    opacity: 0.5;
    width: clamp(0.7rem, 1.5vw, 0.9rem);
    height: clamp(0.7rem, 1.5vw, 0.9rem);
  }

  .chart-section {
    background: #fdfdfd;
    padding: clamp(0.8rem, 3vw, 1.5rem); /* 모바일에서 박스 좌우 여백을 줄여 내부 공간 확보 */
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0; /* 세로 삐져나옴 방지 */
  }

  .chart-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .chart-header h2 { 
    margin: 0; 
    font-size: 1.25rem; 
    color: #1e293b; 
    line-height: 1; /* 텍스트 상하 기본 여백을 없애 퍼센트 타원과 Y축 중앙을 완벽히 맞춤 */
  }
  .chart-header p { margin: 0 0 1rem 0; color: #64748b; font-size: 0.85rem; }

  .chart-container {
    flex-grow: 1; /* 남은 높이를 꽉 채우도록 설정 */
    min-height: 300px;
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
    text-align: center;
  }


  .loading-chart { color: #94a3b8; font-style: italic; }

  /* Table Section Styles */
  .table-section {
    background: #fdfdfd;
    padding: clamp(0.8rem, 3vw, 1.5rem); /* 모바일에서 박스 좌우 여백을 줄여 내부 공간 확보 */
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0; /* 세로 삐져나옴 방지 */
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .table-header h2 { margin: 0; font-size: 1.25rem; color: #1e293b; }

  .table-container {
    overflow: hidden; /* 스크롤바 완전히 제거 */
    flex-grow: 1; /* 남은 높이 채움 */
    min-height: 0;
    position: relative; /* 스피너 위치 기준 */
  }

  table {
    width: 100%;
    height: 100%; /* 표 크기를 컨테이너 크기에 딱 맞춤 */
    border-collapse: collapse;
    text-align: left;
  }

  th, td {
    padding: 0.5rem clamp(0.2rem, 2vw, 1rem); /* 모바일에서는 좌우 여백을 최소화하여 공간 확보 */
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
    gap: 1rem;
    flex-wrap: wrap;
  }

  .peak-text {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #334155;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .peak-text::before {
    content: "";
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #ef4444;
  }

  .no-peak {
    color: #10b981;
    font-weight: 500;
    white-space: nowrap; /* 텍스트 공간이 부족하더라도 절대 두 줄로 꺾이지 않도록 방어 */
  }
  
  .no-peak small {
    color: #64748b;
    font-weight: normal;
  }

  .sparkline-cell {
    width: clamp(80px, 20vw, 150px);
  }

  .sparkline-wrapper {
    position: relative;
    width: clamp(80px, 20vw, 150px);
    height: clamp(30px, 6vw, 40px);
  }
  
  .loading-table {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-height: 200px; /* 데이터가 없을 때의 최소 높이 확보 */
    color: #94a3b8;
    font-size: 1.1rem;
    text-align: center;
  }

  /* CSS 스피너 및 반투명 로딩 오버레이 */
  .loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.6);
    z-index: 10;
    border-radius: inherit;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(7, 46, 93, 0.1);
    border-top-color: #072e5d; /* 테마 색상 (짙은 남색) */
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
