"""Pequenos helpers de formatação compartilhados entre as APIs."""


def formatar_moeda(valor: float) -> str:
    """Formata um número como moeda brasileira (R$ 1.234,56), inclusive
    para negativos (ex: -123.4 -> "-R$ 123,40").
    """
    negativo = valor < 0
    valor_absoluto = abs(valor)
    texto = f"{valor_absoluto:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    return f"{'-' if negativo else ''}R$ {texto}"
