"""Testes do HFM Rules Scanner — valida positivos e ausencia de falsos positivos."""

from scanner.checks import (
    check_circular,
    check_hardcoded_year,
    check_magic_number,
    check_unguarded_division,
)
from scanner.parser import parse_text


def _pf(code: str):
    return parse_text(code, "test.rle")


def test_guarded_division_no_false_positive():
    # Igual ao CalcRules.rle real: divisao protegida por If <> 0.
    code = (
        'Sub Calculate()\n'
        '    dSales = HS.GetCell("A#Sales")\n'
        '    If dSales <> 0 Then\n'
        '        HS.Exp "A#Pct = (A#Sales - A#COGS) / A#Sales * 100"\n'
        '    Else\n'
        '        HS.Clear "A#Pct"\n'
        '    End If\n'
        'End Sub\n'
    )
    assert check_unguarded_division(_pf(code)) == []


def test_unguarded_division_fires():
    code = (
        'Sub Calculate()\n'
        '    HS.Exp "A#Pct = A#COGS / A#Sales * 100"\n'
        'End Sub\n'
    )
    findings = check_unguarded_division(_pf(code))
    assert len(findings) == 1
    assert findings[0].rule_id == "HFM003"
    assert findings[0].severity.value == "critical"


def test_circular_logic_fires():
    code = 'Sub C()\n    HS.Exp "A#Total = A#Total + A#Sales"\nEnd Sub\n'
    findings = check_circular(_pf(code))
    assert len(findings) == 1
    assert findings[0].rule_id == "HFM004"


def test_non_circular_no_false_positive():
    code = 'Sub C()\n    HS.Exp "A#GrossMargin = A#Sales - A#COGS"\nEnd Sub\n'
    assert check_circular(_pf(code)) == []


def test_magic_number_fires():
    code = 'Sub OnDemand_Calculation\n    HS.Exp "A#CogsTP=15424"\nEnd Sub\n'
    findings = check_magic_number(_pf(code))
    assert len(findings) == 1
    assert findings[0].rule_id == "HFM002"


def test_hardcoded_year_fires():
    code = 'Sub C()\n    HS.Exp "A#x = Y#2024.A#Sales"\nEnd Sub\n'
    findings = check_hardcoded_year(_pf(code))
    assert len(findings) == 1
    assert findings[0].rule_id == "HFM001"


def test_line_continuation_joined():
    # A continuacao `_` deve unir as duas linhas fisicas numa logica.
    code = (
        'Sub C()\n'
        '    HS.Exp "A#x = A#a" & _\n'
        '        " + A#b"\n'
        'End Sub\n'
    )
    pf = _pf(code)
    joined = [ll for ll in pf.logical_lines if "A#a" in ll.text]
    assert joined and "A#b" in joined[0].text
    assert joined[0].line == 2  # numero da primeira linha fisica preservado


def test_comment_not_parsed_as_code():
    # Ano em comentario nao deve disparar HFM001.
    code = 'Sub C()\n    \' referencia a 2024 apenas em comentario\nEnd Sub\n'
    assert check_hardcoded_year(_pf(code)) == []


def test_division_fix_wraps_with_guard():
    code = 'Sub C()\n    HS.Exp "A#Margem = A#Lucro / A#Receita"\nEnd Sub\n'
    f = check_unguarded_division(_pf(code))[0]
    assert f.fix is not None
    assert 'HS.GetCell("A#Receita") <> 0 Then' in f.fix
    assert 'HS.Clear "A#Margem"' in f.fix
    assert "End If" in f.fix


def test_hardcoded_year_fix_uses_cur():
    code = 'Sub C()\n    HS.Exp "A#x = Y#2024.A#Sales"\nEnd Sub\n'
    f = check_hardcoded_year(_pf(code))[0]
    assert f.fix is not None and "@CUR" in f.fix and "2024" not in f.fix
