# 2045 STELLAR ASSAULT

1945 스타일 종스크롤 슈팅 게임. HTML5 Canvas + Next.js 기반, Vercel 배포.

**[PLAY NOW](https://2045-six.vercel.app)**

> 브라우저에서 바로 플레이 가능 (PC / 모바일)

## Features

- 10개 스테이지 + 고유 보스전
- 엔딩 크레딧 (10스테이지 클리어 시 스크롤 크레딧)
- 파워업 시스템 (Power / Bomb / Speed / HP)
- 피격 페널티: HP -1, Power -1, Speed -1
- 콤보 & 스코어보드 (Top 10 이름 등록)
- 프로시저럴 BGM (베이스 + 드럼 기반 다크 인더스트리얼)
- 프로시저럴 SFX (Web Audio API, 샘플 파일 없음)
- 모바일 터치 조이스틱 + 버튼 UI
- 볼륨 조절 ( -/+ 키 )
- 개발자 모드 (스테이지 선택 + 엔딩 미리보기)
- 일시정지 중 메뉴 복귀 (Q키)

## Controls

### PC
| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| Space | Shoot (auto-fire) |
| X | Bomb |
| Shift | Focus (slow move, small hitbox) |
| ESC / P | Pause |
| Q | Quit to menu (pause 중) |
| M | Mute |
| - / + | Volume Down / Up |

### Mobile
- Virtual joystick (left side)
- Auto-fire
- Bomb / Focus buttons
- Tap to pause

## Game Design

### Player Stats
- HP: 5
- Fire rate: 0.08s
- Base speed: 4.5 (max 7, +0.4 per speed item)
- Starting bombs: 2 (제한 없음, 무제한 적립)

### 피격 페널티
- HP -1
- Power -1 (최소 1)
- Speed -1 (최소 기본값 4.5)

### 아이템 드랍
- 기본 드랍률: 13~20% (스테이지별 상이)
- 강한 적일수록 드랍률 보너스 (점수 기반: `min(0.6, base + score/2500)`)
- 보스전: Power ≤ 2일 때 파워 아이템 보장
- 아이템 가중치: Power 2 / Bomb 1 / Speed 2 / HP 1~3

### Stages
| Stage | Subtitle | Boss | 특이사항 |
|-------|----------|------|---------|
| 1 | Orbital Perimeter | Sentinel MK-I | 기본 |
| 2 | Asteroid Field | Overlord X-7 | kamikaze 등장 |
| 3 | Nexus Core | Nexus Prime | fury 패턴 |
| 4 | Dark Nebula | Void Walker | sniper 적 등장 |
| 5 | Frozen Frontier | Cryo Titan | HP/SPD 배율 적용 |
| 6 | Solar Furnace | Solar Tyrant | 고열 테마 |
| 7 | Gravity Well | Event Horizon | HP 1.3x, SPD 1.1x |
| 8 | Warp Corridor | Warp King | warper 적 등장 |
| 9 | Hive Nexus | Hive Mother | drone 적, HP 1.4x |
| 10 | Omega Station | Omega Core | HP 1.5x, SPD 1.2x |

### 무적 시스템
- 피격 시 2초 무적
- 무적 중 파란 쉴드 링 표시 (이중 원 + 펄스 애니메이션)

## Tech Stack

- **Framework**: Next.js (TypeScript)
- **Rendering**: HTML5 Canvas 2D (400×700)
- **Audio**: Web Audio API (procedural, no audio files)
- **Deploy**: Vercel

## Project Structure

```
src/
├── app/              # Next.js app router
├── game/
│   ├── engine/       # GameLoop, Renderer, InputManager, CollisionSystem
│   ├── entities/     # Player, Enemy, Boss, Bullet, Item
│   ├── effects/      # Explosion, Background, SoundManager
│   ├── stages/       # StageManager + 10 stage definitions (data/)
│   └── types.ts      # Shared type definitions
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
```

### Dev Mode
메뉴에서 D키 → 비밀번호 입력 → 스테이지 선택 화면
- 1~10 스테이지 직접 선택 플레이
- 엔딩 크레딧 미리보기

### Debug Keys (dev mode only)
| Key | Action |
|-----|--------|
| F1 | Toggle hitbox display |
| F3 | Toggle invincibility |
| F4 | Toggle object count |
| 1-0 | Skip to stage 1-10 |

## Deploy

```bash
npx vercel --prod
```

## Credits

- Game Design & Programming: **ONEIZIC**
- AI Assistant: **Claude Opus 4.6**
- Audio: Procedural Web Audio API
- Deployed on Vercel

## License

MIT
