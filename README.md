# Fruit Ninja Clone (TikTok / Reels Edition)

A vertical (9:16) casual slicing prototype focused on fast gestures, cinematic slow motion, and strong visual feedback for short-form video capture.

## Highlights
- Continuous touch input with real-time gesture smoothing (Catmull-Rom spline)
- Speed-based blade trail width + progressive fade
- Slice detection with thickness based on swipe speed
- Procedural fruit arcs optimized for camera framing
- Smart slow motion (speed, center hit, combo triggers)
- Particle pooling + per-frame budget
- Subtle camera zoom on slow motion + impact shake
- Webcam full-screen background for AR-style capture
- Solid HUD blocks for score/status visibility

## Tech Stack
- Unity 6000.3.6f1 (or compatible 6000.x)
- 2D physics (Rigidbody2D / Collider2D)
- UGUI for HUD and webcam background

## Project Structure
- `Assets/Scripts/Input` (InputManager, GestureAnalyzer, BladeTrail)
- `Assets/Scripts/Slicing` (SliceSystem, Fruit, FruitHalf, FruitDefinition)
- `Assets/Scripts/SlowMo` (SlowMotionController)
- `Assets/Scripts/Spawning` (FruitSpawner)
- `Assets/Scripts/VFX` (VisualEffectsManager, ParticlePool, ImpactFlash)
- `Assets/Scripts/Camera` (AspectRatioEnforcer, CameraImpulseController)
- `Assets/Scripts/UI` (SafeAreaFitter, WebcamBackground, HUDController, CreditsLink)
- `Assets/Scripts/Gameplay` (ScoreManager)

## Quick Start (Scene Wiring)
1) Camera
   - Orthographic camera.
   - Add `AspectRatioEnforcer` and `CameraImpulseController`.
2) Input + Gesture
   - Create `InputSystem` with `InputManager` + `GestureAnalyzer`.
   - Create `BladeTrail` with `LineRenderer` + `BladeTrail`.
3) Slice System
   - Create `SliceSystem` and reference `GestureAnalyzer`.
   - Create layer `Fruit` and assign to fruit prefabs.
4) Slow Motion
   - Add `SlowMotionController` and wire `SliceSystem` + `CameraImpulseController`.
5) VFX
   - Add `VisualEffectsManager` and wire `CameraImpulseController`.
   - (Optional) `ImpactFlash` prefab connected to the manager.
6) Webcam Background
   - Create `Canvas` (Screen Space - Overlay).
   - Add a full-screen `RawImage` and attach `WebcamBackground`.
7) HUD / Score
   - Create solid `Image` blocks with `Text` for score/combos/status.
   - Add `HUDController` and wire the texts/blocks.
   - Add `ScoreManager` and wire `SliceSystem` + `HUDController`.
8) Fruits
   - Create a `Fruit` prefab with `Rigidbody2D`, `Collider2D`, `SpriteRenderer`, `Fruit`.
   - Create two `FruitHalf` prefabs with `Rigidbody2D`, `Collider2D`, `SpriteRenderer`, `FruitHalf`.
   - Create `FruitDefinition` assets and assign sprites, halves, juice particles, colors.
9) Spawner
   - Add `FruitSpawner` and assign the `Fruit` prefab + definitions list.

## Notes
- Input uses `Time.unscaledTime`, so slow motion never blocks touch.
- Slice detection uses `CircleCast` for speed-based blade thickness.
- Particle pool enforces a per-frame budget for mobile stability.
- Webcam background supports rotation, mirroring, and full-screen fill.

## Author
Matheus Siqueira
Website: https://www.matheussiqueira.dev

## License
TBD
