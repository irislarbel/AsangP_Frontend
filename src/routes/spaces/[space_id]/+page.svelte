<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  
  // 데이터 가독성을 위한 유도 상태 (Svelte 5 룬 사용)
  let status = $derived(data.status);
</script>

<div class="container">
  <h1>공간 상태 정보</h1>
  
  {#if status}
    <div class="card">
      <h2>{status.space_name} (ID: {status.space_id})</h2>
      <div class="grid">
        <div class="item">
          <span class="label">WiFi 접속 수</span>
          <span class="value">{status.wifi_count}</span>
        </div>
        <div class="item">
          <span class="label">Bluetooth 감지 수</span>
          <span class="value">{status.bt_count}</span>
        </div>
      </div>
      <p class="footer">
        마지막 업데이트: {status.last_update ? new Date(status.last_update).toLocaleString() : '기록 없음'}
      </p>
    </div>
  {:else}
    <p>데이터를 불러오는 중...</p>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: sans-serif;
  }

  h1 {
    color: #333;
    border-bottom: 2px solid #eee;
    padding-bottom: 0.5rem;
  }

  .card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    margin-top: 1rem;
    border: 1px solid #ddd;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .item {
    background: #f9f9f9;
    padding: 1rem;
    border-radius: 4px;
    text-align: center;
  }

  .label {
    display: block;
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: #ff3e00;
  }

  .footer {
    font-size: 0.8rem;
    color: #999;
    text-align: right;
  }
</style>
