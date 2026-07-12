"""Paridade JS<->Python: o porte do web-demo deve produzir achados identicos.

Roda o script node de paridade como subprocesso e falha se divergir.
Marcado como skip quando node nao esta disponivel (ex.: CI minimo).
"""

import shutil
import subprocess
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parent.parent
_PARITY = _ROOT / "web-demo" / "scripts" / "verify_parity.mjs"


@pytest.mark.skipif(shutil.which("node") is None, reason="node nao instalado")
def test_js_python_parity():
    assert _PARITY.exists(), "script de paridade ausente"
    r = subprocess.run(
        ["node", str(_PARITY)],
        cwd=_ROOT, capture_output=True, text=True, timeout=60,
    )
    assert r.returncode == 0, f"paridade falhou:\n{r.stdout}\n{r.stderr}"
    assert "PARITY OK" in r.stdout
