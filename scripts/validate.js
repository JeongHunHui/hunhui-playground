#!/usr/bin/env node
/**
 * 배포 전 검증 스크립트
 * 1. public/ 안의 모든 게임 폴더에 index.html이 있는지 확인
 * 2. 메인 index.html에 해당 게임 링크가 있는지 확인
 * 3. index.html 내 그리드 div 구조가 올바른지 확인 (카드가 그리드 밖에 없는지)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const INDEX = path.join(ROOT, 'index.html');
const SKIP = new Set(['api', 'vite.svg']);

let errors = 0;

const err = (msg) => { console.error(`❌ ${msg}`); errors++; };
const ok  = (msg) => console.log(`✅ ${msg}`);

const games = fs.readdirSync(PUBLIC).filter(f => {
  const full = path.join(PUBLIC, f);
  return fs.statSync(full).isDirectory() && !SKIP.has(f);
});

const indexHtml = fs.readFileSync(INDEX, 'utf-8');

for (const game of games) {
  const gameIndex = path.join(PUBLIC, game, 'index.html');
  if (!fs.existsSync(gameIndex)) err(`public/${game}/index.html 없음`);
  else ok(`public/${game}/index.html 존재`);

  if (!indexHtml.includes(`href="/${game}/"`)) err(`index.html에 /${game}/ 링크 없음`);
  else ok(`index.html에 /${game}/ 링크 있음`);
}

// 그리드 닫힌 이후 footer 이전에 카드가 있으면 안됨
const footerIdx = indexHtml.indexOf('<footer');
const lastGridClose = indexHtml.lastIndexOf('</div>', footerIdx);
const betweenGridAndFooter = indexHtml.slice(lastGridClose, footerIdx);
const cardsOutside = (betweenGridAndFooter.match(/class="card/g) || []).length;

if (cardsOutside > 0) err(`그리드 밖에 카드 ${cardsOutside}개 — </div> 위치 오류`);
else ok(`그리드 구조 정상 (카드 총 ${(indexHtml.match(/class="card/g)||[]).length}개)`);

console.log(`\n총 게임 폴더: ${games.length}개`);
if (errors > 0) { console.error(`\n⛔ 검증 실패: ${errors}개 오류`); process.exit(1); }
else console.log(`\n🎉 모든 검증 통과!`);
