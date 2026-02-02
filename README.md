# Fruit Ninja Clone (TikTok / Reels Edition)

Este pacote contem os scripts principais para um prototipo 2D vertical (9:16) com input continuo, spline de gesto, corte, slow motion, VFX e spawn procedural.

## Estrutura
- `Assets/Scripts/Input` (InputManager, GestureAnalyzer, BladeTrail)
- `Assets/Scripts/Slicing` (SliceSystem, Fruit, FruitHalf, FruitDefinition)
- `Assets/Scripts/SlowMo` (SlowMotionController)
- `Assets/Scripts/Spawning` (FruitSpawner)
- `Assets/Scripts/VFX` (VisualEffectsManager, ParticlePool, ImpactFlash)
- `Assets/Scripts/Camera` (AspectRatioEnforcer, CameraImpulseController)
- `Assets/Scripts/UI` (SafeAreaFitter)
- `Assets/Scripts/UI` (WebcamBackground, HUDController)
- `Assets/Scripts/Gameplay` (ScoreManager)

## Montagem rapida (Unity 2D)
1. **Camera**
   - Camera ortografica.
   - Adicione `AspectRatioEnforcer` e `CameraImpulseController`.
2. **Input + Gesture**
   - Crie um GameObject `InputSystem` e adicione `InputManager` e `GestureAnalyzer`.
   - Crie um GameObject `BladeTrail` com `LineRenderer` + `BladeTrail`.
   - Em `BladeTrail`, referencie o `GestureAnalyzer`.
3. **Slice System**
   - Crie `SliceSystem` e referencie o `GestureAnalyzer`.
   - Crie a layer `Fruit` e atribua no campo `fruitLayer`.
4. **Slow Motion**
   - Adicione `SlowMotionController` e conecte `SliceSystem` + `CameraImpulseController`.
5. **VFX**
   - Crie `VisualEffectsManager` e conecte `CameraImpulseController`.
   - (Opcional) Instancie um prefab `ImpactFlash` e conecte no manager.
6. **Background (Webcam)**
   - Crie um `Canvas` no modo Screen Space - Overlay.
   - Adicione um `RawImage` full screen (anchors 0..1) e aplique o script `WebcamBackground`.
   - (Opcional) Ajuste `mirrorHorizontal` e o dispositivo da camera.
6. **Frutas**
   - Crie um prefab `Fruit` com `Rigidbody2D`, `Collider2D`, `SpriteRenderer` e `Fruit`.
   - Crie prefabs `FruitHalf` (duas metades) com `Rigidbody2D`, `Collider2D`, `SpriteRenderer` e `FruitHalf`.
   - Crie `FruitDefinition` assets e preencha: sprites, prefabs das metades, particulas, cores.
7. **HUD / Score**
   - Crie blocos solidos (`Image`) com `Text` para score/combos/status.
   - Adicione `HUDController` e conecte os textos/blocks.
   - Adicione `ScoreManager` e conecte `SliceSystem` + `HUDController`.
8. **Creditos**
   - Crie um `Text` com \"Desenvolvido por Matheus Siqueira\".
   - Crie um `Button` com `Text` para o link `www.matheussiqueira.dev`.
   - Adicione `CreditsLink` e conecte o `Button` + textos (o click abre o site).
9. **Spawner**
   - Crie `FruitSpawner` e atribua o prefab `Fruit` + lista de `FruitDefinition`.

## Notas
- `InputManager` usa `Time.unscaledTime` para garantir input durante slow motion.
- `SliceSystem` usa `CircleCast` para espessura do corte baseada na velocidade.
- `VisualEffectsManager` aplica budget por frame para particulas.
- `CameraImpulseController` adiciona zoom suave no slow motion e shake de impacto.

## Ajustes recomendados
- `GestureAnalyzer.smoothingDistance` para suavidade da spline.
- `BladeTrail` para largura e fade.
- `SlowMotionController` para thresholds de velocidade/centro/combo.
- `FruitSpawner` para arcos e cadencia de spawn.
