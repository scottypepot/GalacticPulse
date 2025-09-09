# Audio Assets

Place your audio files in this directory with the following names:

## Required Audio Files:

1. **Background Music** (Game music during gameplay)
   - `background-music.mp3` (recommended)
   - Or `game music.wav` (as currently named)
   - Or `background-music.ogg`

2. **Player Loss Sound** (Played when game ends/player dies)
   - `player-loss.mp3` (recommended)
   - Or `player loss.wav` (as currently named)
   - Or `player-loss.ogg`

3. **Player Win Sound** (Played for victories/achievements)
   - `player-win.mp3` (recommended)
   - Or `player win.wav` (as currently named)
   - Or `player-win.ogg`

4. **Round Finish Sound** (Played when completing a round/wave)
   - `round-finish.mp3` (recommended)
   - Or `round finish.wav`
   - Or `round-finish.ogg`

## Supported Formats:
- **MP3** (recommended for web compatibility)
- **WAV** (uncompressed, larger files)
- **OGG** (good compression, open source)

## Audio Usage in Game:
- **Background Music**: Loops continuously during gameplay, fades for special events
- **Player Loss**: Plays on game over with music fade transition
- **Player Win**: Plays for milestone achievements (every 25-100 kills depending on mode)
- **Round Finish**: Plays when a round/wave is completed, music temporarily fades and resumes

## Notes:
- The game will automatically try multiple formats for browser compatibility
- Files should be optimized for web (not too large)
- Recommended length: 
  - Background music: 1-3 minutes (will loop)
  - Sound effects: 1-5 seconds
  - Round finish: 2-4 seconds (brief celebration)
- All volume will be controlled by the in-game settings
- Round finish sound volume is controlled by the SFX volume setting
