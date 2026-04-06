# 2045 STELLAR ASSAULT

1945 스타일 종스크롤 슈팅 게임. HTML5 Canvas + Next.js 기반, Vercel 배포.

**[PLAY NOW](https://2045-six.vercel.app)**

## Screenshots

> 브라우저에서 바로 플레이 가능 (PC / 모바일)

## Features

- 10개 스테이지 + 고유 보스전
- 파워업 시스템 (Power / Bomb / Speed / HP)
- 콤보 & 스코어보드
- 프로시저럴 BGM (베이스 + 드럼 기반 다크 인더스트리얼)
- 프로시저럴 SFX (Web Audio API, 샘플 파일 없음)
- 모바일 터치 조이스틱 + 버튼 UI
- 볼륨 조절 ( -/+ 키 )

## Controls

### PC
| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| Space | Shoot (auto-fire) |
| X | Bomb |
| Shift | Focus (slow move, small hitbox) |
| ESC / P | Pause |
| M | Mute |
| - / + | Volume Down / Up |

### Mobile
- Virtual joystick (left side)
- Auto-fire
- Bomb / Focus buttons
- Tap to pause

## Tech Stack

- **Framework**: Next.js (TypeScript)
- **Rendering**: HTML5 Canvas 2D
- **Audio**: Web Audio API (procedural, no audio files)
- **Deploy**: Vercel

## Project Structure

```
src/
├── app/              # Next.js app router
├── game/
│   ├── engine/       # GameLoop, Renderer, Input, Collision
│   ├── entities/     # Player, Enemy, Boss, Bullet, Item
│   ├── effects/      # Explosion, Background, SoundManager
│   ├── stages/       # StageManager + 10 stage definitions
│   └── types.ts      # Shared type definitions
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
```

### Debug Keys (dev mode only)
| Key | Action |
|-----|--------|
| F1 | Toggle hitbox display |
| F3 | Toggle invincibility |
| F4 | Toggle object count |
| 1-0 | Skip to stage 1-10 |

## Game Design

### Difficulty
- HP: 5 (hard penalty)
- Hit: power resets to 1
- HP pack: +1 HP
- Item drop: 13~14% (varies by stage)
- Boss drops guaranteed power items when underpowered

### Stages
| Stage | Subtitle | Boss |
|-------|----------|------|
| 1 | Orbital Perimeter | Sentinel MK-I |
| 2 | Asteroid Field | Overlord X-7 |
| 3 | Nexus Core | Nexus Prime |
| 4-10 | ... | Unique bosses |

## Deploy

```bash
npx vercel --prod
```

## License

MIT
