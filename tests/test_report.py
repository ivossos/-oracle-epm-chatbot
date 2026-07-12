"""Testes do relatorio HTML — card de correcoes, botao Copiar, regra de impressao."""

from scanner.cli import scan_sources
from scanner.report import render_html

_UNGUARDED = 'Sub C()\n    HS.Exp "A#M = A#L / A#R"\nEnd Sub\n'
_CLEAN = 'Sub Z()\n    HS.Exp "A#a = A#b - A#c"\nEnd Sub\n'


def _html(code: str) -> str:
    return render_html(scan_sources([("e.rle", code)]))


def test_fix_summary_card_present():
    h = _html(_UNGUARDED)
    assert "Correções sugeridas" in h
    assert "card fix-card" in h


def test_copy_button_wired_once():
    h = _html(_UNGUARDED)
    assert 'onclick="copyFix(this)"' in h
    assert "function copyFix" in h
    assert h.count('class="copy"') == 1  # um fix -> um botao


def test_copy_button_hidden_on_print():
    assert ".copy { display: none; }" in _html(_UNGUARDED)


def test_fix_block_renders_corrected_script():
    h = _html(_UNGUARDED)
    assert "If HS.GetCell(&quot;A#R&quot;) &lt;&gt; 0 Then" in h  # HTML-escaped
    assert "HS.Clear" in h and "End If" in h


def test_clean_rule_has_card_but_no_copy_button():
    h = _html(_CLEAN)
    assert "card fix-card" in h          # card de resumo sempre presente
    assert 'class="copy"' not in h        # sem fixes -> sem botao
