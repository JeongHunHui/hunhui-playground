# 🎮 훈희 플레이그라운드

개인 게임/서비스 모음. 모든 게임은 단일 HTML 파일 또는 정적 폴더 구조로 구성.

Live: https://hunhui-playground.vercel.app

---

## 🕹️ 게임 목록

| 경로 | 이름 | 설명 |
|------|------|------|
| `/vampire/` | 🧛 훈희 서바이벌 | 자동 전투 생존 RPG (뱀파이어 서바이벌류) |
| `/pkmnquiz/` | ⚡ 포켓몬 퀴즈 | 실루엣 보고 포켓몬 맞추기 |
| `/defense/` | 🏰 훈희 디펜스 | 타워 디펜스 게임 |
| `/english/` | 📚 영어 학습 | 영단어 퀴즈 |
| `/lovestory/` | 💕 연애 시뮬레이션 | 미연시 (하유나, 서지연, 오하린) |
| `/survivor/` | 🏹 Arrow Survivor | 화살 생존 게임 |
| `/g2048/` | 🎲 2048 | 타일 합치기 |
| `/solitaire/` | 🃏 솔리테어 | 카드 게임 |
| `/dadgame/` | 👊 아빠와 나 | 격투 액션 미니게임 |
| `/ageofwar/` | ⚔️ 전쟁시대 | 시대 진화 전략 게임 |
| `/cookierun/` | 🍪 쿠키런 | 쿠키런 스타일 러너 |
| `/catwar/` | 🐱 냥코 대전쟁 | 냥코 스타일 전투 |
| `/rhythm/` | 🎵 피아노 타일 | 리듬 게임 4키 |
| `/luck/` | 🔮 신정달럼 | M2 무삶의 운세 |
| `/news/` | 📰 뉴스피드 | 게임·개발·세상 소식 |
| `/stocks/` | 📈 주식 차트 | 실시간 주가 조회 |
| `/videos/` | 🎬 영상 컬렉션 | YouTube 영상 모아보기 |
| `/danmaku/` | 🔫 탄막 슈팅 | Touhou 스타일 bullet hell |
| `/puzzdra/` | 🐉 퍼즐&드래곤 | 퍼드 스타일 오브 퍼즐 RPG |

---

## 🧛 훈희 서바이벌 상세

### 구조 (`vampire/`)
```
vampire/
  index.html       # HTML 진입점 (스크립트/CSS 로드)
  css/style.css    # 전체 스타일
  js/config.js     # 무기 정의, 적 타입, 아이템 정의, 등급 상수
  js/player.js     # 플레이어 상태, 초기화
  js/enemies.js    # 적 스폰, 이동, killEnemy, 보스
  js/weapons.js    # 무기 발사, 업데이트, hit cooldown
  js/items.js      # 아이템 드롭, 등급 시스템, 픽업
  js/effects.js    # 파티클, 토스트, 화면 플래시
  js/ui.js         # HUD 업데이트, 레벨업 카드, 오버레이
  js/game.js       # 메인 루프, 캔버스, 리사이즈
```

### 무기 목록 (14개)
- 🗡 단검, 🪓 도끼, ✨ 마법진, 🔥 파이어볼, ⚡ 번개, ❄️ 냉기장
- ✝️ 성광, ☠️ 독구름, 👻 유령, ☄️ 유성우, 🌀 보호막, 🔴 레이저, 🧿 소환진, 💥 지진

### 아이템 목록 (60개+)
공격형 / 생존형 / 유틸형 / 특수·전설형으로 분류. 각 아이템은 픽업 시 등급(일반~초월) 적용.

### 등급 시스템
일반(38%) → 레어(26%) → 희귀(18%) → 에픽(11%) → 유니크(5%) → 레전드(2%) → 초월(1%)

### 밸런스 설정
Google Sheets `밸런스설정` 탭에 모든 수치 저장. 게임 시작 시 `/api/config`로 1회 로드.
Sheet ID: `1C-ZzU2SFfrQ5Wv76smw-3qsouT0c5CP9zuIB7DdvzV8`

### 랭킹 시스템
Google Sheets `훈희서바이벌스코어` 탭. `/api/ranking.js` Vercel 서버리스 API.

---

## 🛠️ 개발 가이드

### 배포
```bash
# Vercel 직접 배포 (GitHub Actions로도 자동 배포)
vercel --token YOUR_VERCEL_TOKEN --prod --yes
```
> ⚠️ **GitHub Pages 절대 사용 금지** — Vercel만 사용

### 새 게임 추가
1. `/게임이름/index.html` 생성 (단일 파일 또는 폴더)
2. Google Analytics 태그 `G-SLQMKSZ1LF` 추가
3. 홈 버튼 링크 `href="/"` 추가
4. `index.html` 홈페이지 카드 목록에 추가

### 환경변수 (Vercel)
- `GOOGLE_SA_B64`: Google 서비스 계정 JSON (base64)

### Google Analytics
Property ID: `526363001` / Tag: `G-SLQMKSZ1LF`

### Git 커밋 설정
```bash
git config user.name "JeongHunHUI"
git config user.email "jeonghunhui@gmail.com"
```

---

## 🤖 AI 개발 노트 (OpenClaw)

- 밸런스 패치 후 `밸런스설정` 시트의 `BALANCE_PATCH` 값 업데이트
- `작업현황` 시트에 현재 작업 상태 기록
- 슬랙 메시지에 볼드(\*\*) 사용 금지
- 커밋 작성자: `JeongHunHUI <jeonghunhui@gmail.com>`
