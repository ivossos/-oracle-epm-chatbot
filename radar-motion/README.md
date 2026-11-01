# Radar IA Brasil — motion vertical (9:16)

Vídeo de 75 s que resume a edição de **31/10/2026** do Radar IA Brasil (a seção "Hoje" do site),
com narração gerada no ElevenLabs (voz "Carla – Institutional", modelo eleven_v4) e legenda palavra a palavra.

- `radar-ia-brasil-2026-10-31.mp4` — vídeo final, 1080×1920, 30 fps, H.264 + AAC
- `index.html` — a animação (GSAP). Abra `index.html?play` num servidor local e clique para ver com áudio
- `assets/narracao.mp3` — narração do ElevenLabs
- `assets/words.json` / `words.js` — tempos de cada palavra (transcrição ElevenLabs Scribe), usados nas legendas
- `render.mjs` — renderiza quadro a quadro com Playwright e junta o áudio com ffmpeg

    node render.mjs                          # gera o MP4
    node render.mjs --preview 5,20,40        # salva quadros soltos em preview/

O conteúdo (números, fontes, datas) vem de `editions/2026-10-31.json` do repositório `ivossos/radar-ia-brasil`.
