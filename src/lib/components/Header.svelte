<header class="main-header">
  <div class="header-content">
    <a href="https://www.ajou.ac.kr" class="logo-link">
      <img src="/LandingPageBanner.png" alt="Logo" class="header-logo" />
      <span class="logo-text">아주대학교</span>
    </a>
    <div class="header-text">
      <h1 class="header-title">자리찾아주</h1>
      <p class="subtitle">실시간 공간 혼잡도 모니터링</p>
    </div>
  </div>
</header>

<style>
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

  .header-title {
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

  /* 모바일 최적화: 로고 좌측, 텍스트 중앙 유지하되 겹치지 않도록 조치 */
  @media (max-width: 768px) {
    .header-content {
      /* 기본 flex 센터 정렬 유지 (텍스트는 중앙) */
    }
    .logo-link {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      flex-direction: column; /* 로고와 텍스트를 위아래로 배치 */
      gap: 0.2rem; /* 간격 축소 */
    }
    .logo-text {
      font-size: 0.7rem; /* 가로폭을 줄이기 위해 폰트 축소 */
    }
    .header-logo {
      height: 1.8rem; /* 세로 배치를 고려해 로고 크기 축소 */
    }
    .header-title {
      font-size: 1.6rem; /* 제목 크기 확대 */
    }
    .subtitle {
      font-size: 0.9rem;
    }
  }
</style>
