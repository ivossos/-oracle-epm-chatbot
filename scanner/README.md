# HFM Rules Scanner — Kit "5-Day Proof of Value"

Análise estática **read-only** de regras HFM (`.rle` / `.vbs`).
Nenhuma conexão ao HFM: o parser lê os arquivos exportados e produz achados.
Processamento 100% local — os arquivos não saem da máquina.

## UI web (arrastar e soltar)

```bash
python3 -m scanner.web          # abre http://127.0.0.1:8765 no navegador
python3 -m scanner.web --port 9000 --no-open
```

Arraste os `.rle`/`.vbs` na área indicada → **Analisar** → o relatório branded
aparece na própria página, com botão para baixar o HTML (imprimir → PDF).

Duas abas:
- **📁 Arquivos** — arrastar e soltar um ou vários arquivos.
- **✏️ Editor** — colar/editar uma regra e analisar ao vivo (com numeração de
  linha e botão "Carregar exemplo"). Ideal para demonstrar um achado
  aparecendo/sumindo conforme a regra é ajustada.

## CLI

```bash
python3 -m scanner.cli samples --json out/hfm-findings.json --html out/hfm-report.html
```

`exit code 1` quando há achados **críticos** (útil como gate de CI/parceiro).

## Checks (v0.1.0)

| ID | Severidade | Detecta |
|---|---|---|
| HFM001 | Atenção | Ano fixo/hardcoded (`Y#2024`) |
| HFM002 | Atenção | Número mágico em `HS.Exp` |
| HFM003 | **Crítico** | Divisão sem proteção contra zero (respeita `If <> 0`) |
| HFM004 | **Crítico** | Lógica circular (`A#x = A#x + ...`) |
| HFM005 | Info | Inconsistência de caixa `HS.` / `Hs.` |

## Testes

```bash
python3 -m pytest tests/ -q
```

## Estrutura

- `scanner/parser.py` — parser VBScript leve (blocos, continuação `_`, membros)
- `scanner/checks.py` — as verificações
- `scanner/model.py` — modelo de achados (JSON)
- `scanner/report.py` — relatório HTML branded
- `scanner/cli.py` — linha de comando
- `scanner/web.py` — UI web local (stdlib, sem dependências)

## Limites (escopo v1)

- Heurística por regex, não AST completo de VBScript.
- Sem grafo de dependência cross-file.
- PDF nativo adiado — use *Imprimir → Salvar como PDF* no relatório HTML.
