<header class="main-header">
  <div class="header-content">
    <a href="https://www.ajou.ac.kr" class="logo-link">
      <img src="/LandingPageBanner.png" alt="Logo" class="header-logo" />
      <span class="logo-text">아주대학교</span>
    </a>
    <div class="header-text">
      <h1 class="header-title">AsangP Dashboard</h1>
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
</style>
