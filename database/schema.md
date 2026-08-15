# Estrutura do Banco de Dados (Firebase Realtime Database)

Levantada a partir das telas existentes. O banco continua sendo o Realtime
Database — o que muda é que só o **backend** acessa esses nós diretamente
(via Admin SDK); o front-end passa a falar só com a API.

## `usuarios/{uid}`
```json
{
  "email": "cauadev@barbearia.com",
  "nome": "Cauã Dev",
  "perfil": "master"   // "master" = acesso administrativo total
}
```

## `registrosBarbearia/{id}`  (fichas / faturamento — usado por index.html)
```json
{
  "data": "14/08/2026",
  "faturamento": 150.00
  // demais campos específicos da ficha (barbeiro, serviços, etc.)
}
```

## `registrosCaixa/{id}`
```json
{
  "data": "14/08/2026",
  "taxasMaquina": 12.50
}
```

## `registrosFreezer/{id}`
```json
{
  "data": "14/08/2026",
  "total": 45.00
}
```

## `registrosInsumos/{id}`
```json
{
  "data": "14/08/2026",
  "total": 200.00
}
```

## `registrosRelatorios/{id}`  (restrito a "master")
```json
{
  "data": "14/08/2026",
  "texto": "Observação do dia...",
  "timestamp": 1755000000000
}
```

## `registrosLembretes/{id}`  (restrito a "master")
```json
{
  "dataISO": "2026-08-20",
  "dataBR": "20/08/2026",
  "texto": "Pagar cadeira nova"
}
```

> Observação: os campos `faturamento`, `total`, `taxasMaquina` de cada nó
> foram inferidos pelo uso em `resultados.html`. Ao migrar cada tela,
> confirme os nomes exatos de campo usados no `index.html`, `caixa.html`,
> `freezer.html` e `insumos.html` originais.
