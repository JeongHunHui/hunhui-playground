import { useState } from 'react'
import './App.css'

const GAMES = [
  { path: "/vampire/", emoji: "🧛", name: "훈희 서바이벌", desc: "🔴 자동 전투 생존 RPG", hot: true },
  { path: "/pkmnquiz/", emoji: "⚡", name: "포켓몬 퀴즈", desc: "누구냐 넌?" },
  { path: "/danmaku/", emoji: "🌟", name: "탄막 슈팅", desc: "탄막 × 도트 슈팅" },
  { path: "/puzzdra/", emoji: "🧩", name: "퍼즐&드래곤", desc: "퍼즐 RPG" },
  { path: "/defense/", emoji: "🏰", name: "훈희 디펜스", desc: "몬스터를 막아라!" },
  { path: "/english/", emoji: "📚", name: "영어 학습", desc: "영단어 퀴즈" },
  { path: "/g2048/", emoji: "🎮", name: "2048", desc: "타일 합치기" },
  { path: "/solitaire/", emoji: "🃏", name: "솔리테어", desc: "클래식 카드 게임" },
  { path: "/dadgame/", emoji: "👊", name: "아빠와 나", desc: "격투 액션 5라운드" },
  { path: "/ageofwar/", emoji: "⚔️", name: "전쟁시대", desc: "시대 진화 전략 게임" },
  { path: "/cookierun/", emoji: "🍪", name: "쿠키런", desc: "점프 러닝 게임" },
  { path: "/catwar/", emoji: "🐱", name: "냥코 대전쟁", desc: "횡스크롤 진영 전투" },
  { path: "/rhythm/", emoji: "🎵", name: "피아노 타일", desc: "리듬 게임 4키" },
  { path: "/luck/", emoji: "🔮", name: "신점닷컴", desc: "MZ 무당의 운세" },
  { path: "/news/", emoji: "📰", name: "뉴스피드", desc: "게임·개발·서브컬처" },
  { path: "/stocks/", emoji: "📈", name: "주식 차트", desc: "실시간 주가 조회" },
  { path: "/videos/", emoji: "🎬", name: "영상 컬렉션", desc: "YouTube 영상 모아보기" },
  { path: "/lovestory/", emoji: "💕", name: "연애 시뮬레이션", desc: "미연시 · 호감도 엔딩" },
  { path: "/survivor/", emoji: "🏹", name: "Arrow Survivor", desc: "화살 × ÷ 게이트 게임" },
]

function GameCard({ game }) {
  return (
    <a className={`card${game.hot ? ' card-hot' : ''}`} href={game.path}>
      <span className="card-emoji">{game.emoji}</span>
      <span className="card-name">{game.name}</span>
      <span className="card-desc">{game.desc}</span>
    </a>
  )
}

export default function App() {
  const [search, setSearch] = useState('')
  const filtered = GAMES.filter(g =>
    g.name.includes(search) || g.desc.includes(search)
  )

  return (
    <div className="container">
      <div className="blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      <div className="content">
        <h1 className="title">🎮 훈희 플레이그라운드</h1>
        <p className="subtitle">훈희의 미니게임 모음 — 심심할 때 하나씩</p>
        <input
          className="search"
          placeholder="🔍 게임 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="grid">
          {filtered.map(g => <GameCard key={g.path} game={g} />)}
        </div>
        <footer>built with curiosity · hunhui.cloud</footer>
      </div>
    </div>
  )
}
