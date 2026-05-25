<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let spaces = $derived(data.spaces);

  function getStatusColor(result: string) {
    switch (result) {
      case '여유': return '#4caf50';
      case '보통': return '#ff9800';
      case '혼잡': return '#f44336';
      default: return '#9e9e9e';
    }
  }
</script>

<div class="container">
  <header>
    <h1>AsangP Dashboard</h1>
    <p class="subtitle">실시간 공간 혼잡도 모니터링</p>
  </header>

  <div class="space-grid">
    {#each spaces as space}
      <a href="/spaces/{space.space_id}" class="space-card">
        <div class="status-badge" style:background-color={getStatusColor(space.result)}>
          {space.result}
        </div>
        <div class="card-content">
          <h2>{space.space_name}</h2>
          <div class="count-box">
            <span class="label">혼잡도 지수</span>
            <span class="value">{space.count.toFixed(1)}</span>
          </div>
          <p class="last-update">
            {space.last_update ? new Date(space.last_update).toLocaleTimeString() : ''} 업데이트
          </p>
        </div>
        <div class="card-footer">
          상세 분석 보기 &rarr;
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  :global(body) {
    background-color: #f5f7fa;
    margin: 0;
    font-family: 'Pretendard', sans-serif;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    color: #1a202c;
    margin-bottom: 0.5rem;
    font-size: 2.5rem;
  }

  .subtitle {
    color: #718096;
    font-size: 1.1rem;
  }

  .space-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
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
  }

  .space-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
  }

  .status-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
    color: white;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .card-content {
    padding: 2rem 1.5rem;
    flex-grow: 1;
  }

  h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    color: #2d3748;
  }

  .count-box {
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 12px;
    margin-bottom: 1rem;
  }

  .label {
    display: block;
    font-size: 0.85rem;
    color: #a0aec0;
    margin-bottom: 0.25rem;
  }

  .value {
    font-size: 2rem;
    font-weight: 800;
    color: #2d3748;
  }

  .last-update {
    font-size: 0.75rem;
    color: #cbd5e0;
    text-align: center;
    margin: 0;
  }

  .card-footer {
    padding: 1rem;
    background: #edf2f7;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
    color: #4a5568;
    transition: background 0.2s;
  }

  .space-card:hover .card-footer {
    background: #e2e8f0;
    color: #2d3748;
  }
</style>
