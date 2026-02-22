const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Tabela de reajuste: [faixa etária][sexo] => { reajuste, desconto, acrescimo }
// Faixa 0: 18-39, Faixa 1: 40-69, Faixa 2: 70-99
// Sexo: M = 0, F = 1
const TABELA_REAJUSTE = {
  0: { M: { reajuste: 10, desconto: 10, acrescimo: 17 }, F: { reajuste: 8, desconto: 11, acrescimo: 16 } },
  1: { M: { reajuste: 8, desconto: 5, acrescimo: 15 }, F: { reajuste: 10, desconto: 7, acrescimo: 14 } },
  2: { M: { reajuste: 15, desconto: 15, acrescimo: 13 }, F: { reajuste: 17, desconto: 17, acrescimo: 12 } }
};

function getFaixaEtaria(idade) {
  if (idade >= 18 && idade <= 39) return 0;
  if (idade >= 40 && idade <= 69) return 1;
  if (idade >= 70 && idade <= 99) return 2;
  return -1;
}

function validarDados(idade, sexo, salario_base, anoContratacao, matricula) {
  const erros = [];

  if (idade === undefined || idade === '' || isNaN(Number(idade)) || Number(idade) <= 16) {
    erros.push('Idade deve ser um número maior que 16.');
  }
  if (sexo === undefined || sexo === '' || !['M', 'F'].includes(sexo.toUpperCase())) {
    erros.push('Sexo deve ser M (masculino) ou F (feminino).');
  }
  if (salario_base === undefined || salario_base === '' || isNaN(parseFloat(salario_base)) || parseFloat(salario_base) < 0) {
    erros.push('Salário base deve ser um número real válido.');
  }
  if (anoContratacao === undefined || anoContratacao === '' || !Number.isInteger(Number(anoContratacao)) || Number(anoContratacao) <= 1960) {
    erros.push('Ano de contratação deve ser um número inteiro maior que 1960.');
  }
  if (matricula === undefined || matricula === '' || !Number.isInteger(Number(matricula)) || Number(matricula) <= 0) {
    erros.push('Matrícula deve ser um número inteiro maior que zero.');
  }

  const idadeNum = Number(idade);
  if (erros.length === 0 && getFaixaEtaria(idadeNum) === -1) {
    erros.push('Idade deve estar entre 18 e 99 anos (faixa etária válida).');
  }

  return erros;
}

function calcularNovoSalario(idade, sexo, salarioBase, anoContratacao) {
  const faixa = getFaixaEtaria(Number(idade));
  const sexoKey = sexo.toUpperCase();
  const regra = TABELA_REAJUSTE[faixa][sexoKey];

  const anoAtual = new Date().getFullYear();
  const anosNaEmpresa = anoAtual - Number(anoContratacao);
  const salario = parseFloat(salarioBase);

  let valorAplicado = 0;
  if (anosNaEmpresa <= 10) {
    valorAplicado = -regra.desconto;
  } else {
    valorAplicado = regra.acrescimo;
  }

  const comReajuste = salario * (1 + regra.reajuste / 100);
  const novoSalario = comReajuste + valorAplicado;

  return {
    novoSalario: Math.round(novoSalario * 100) / 100,
    reajustePercentual: regra.reajuste,
    valorAplicado,
    anosNaEmpresa
  };
}

function paginaInstrucoes() {
  const urlExemplo = 'http://localhost:' + PORT + '/?idade=18&sexo=F&salario_base=1700&anoContratacao=2014&matricula=12345';
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reajuste de Salário - Instruções</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    p { line-height: 1.6; color: #555; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
    .url-exemplo { word-break: break-all; background: #fff; padding: 12px; border-radius: 6px; margin: 16px 0; border: 1px solid #ddd; }
    ul { color: #555; }
  </style>
</head>
<body>
  <h1>Reajuste de Salário</h1>
  <p>Esta aplicação calcula o reajuste salarial do funcionário com base na idade, sexo, salário base e tempo de empresa.</p>
  <p><strong>Como usar:</strong> Informe os dados na URL através dos parâmetros de consulta (query string):</p>
  <ul>
    <li><code>idade</code> – idade do funcionário (maior que 16)</li>
    <li><code>sexo</code> – M (masculino) ou F (feminino)</li>
    <li><code>salario_base</code> – salário base (número real)</li>
    <li><code>anoContratacao</code> – ano de contratação (inteiro maior que 1960)</li>
    <li><code>matricula</code> – matrícula do funcionário (inteiro maior que zero)</li>
  </ul>
  <p><strong>Exemplo de URL:</strong></p>
  <div class="url-exemplo">${urlExemplo}</div>
  <p>Acesse o link acima ou altere os valores na barra de endereço para calcular o reajuste.</p>
</body>
</html>
`;
}

function paginaResultado(dados, resultado) {
  const anosTexto = resultado.anosNaEmpresa <= 10
    ? `Até 10 anos (desconto de R$ ${Math.abs(resultado.valorAplicado).toFixed(2)})`
    : `Mais de 10 anos (acréscimo de R$ ${resultado.valorAplicado.toFixed(2)})`;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resultado - Reajuste de Salário</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #4472C4; color: white; }
    .destaque { background: #E2EFDA !important; font-weight: bold; font-size: 1.1em; color: #2E7D32; }
    .voltar { display: inline-block; margin-top: 20px; color: #4472C4; text-decoration: none; }
    .voltar:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Dados do Funcionário</h1>
  <table>
    <tr><th>Campo</th><th>Valor</th></tr>
    <tr><td>Matrícula</td><td>${dados.matricula}</td></tr>
    <tr><td>Idade</td><td>${dados.idade} anos</td></tr>
    <tr><td>Sexo</td><td>${dados.sexo === 'M' ? 'Masculino' : 'Feminino'}</td></tr>
    <tr><td>Salário base</td><td>R$ ${parseFloat(dados.salario_base).toFixed(2)}</td></tr>
    <tr><td>Ano de contratação</td><td>${dados.anoContratacao}</td></tr>
    <tr><td>Tempo na empresa</td><td>${resultado.anosNaEmpresa} anos (${anosTexto})</td></tr>
    <tr><td>Reajuste aplicado</td><td>${resultado.reajustePercentual}%</td></tr>
    <tr class="destaque"><td>Novo salário</td><td>R$ ${resultado.novoSalario.toFixed(2)}</td></tr>
  </table>
  <a class="voltar" href="/">Calcular outro reajuste</a>
</body>
</html>
`;
}

function paginaErro(erros) {
  const listaErros = erros.map(e => '<li>' + e + '</li>').join('');
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dados inválidos</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #c62828; }
    .aviso { background: #ffebee; border: 1px solid #ef9a9a; padding: 16px; border-radius: 8px; color: #b71c1c; }
    ul { margin: 12px 0 0 20px; }
    .voltar { display: inline-block; margin-top: 20px; color: #4472C4; text-decoration: none; }
    .voltar:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Não foi possível calcular o reajuste</h1>
  <p class="aviso">Os dados enviados são inválidos. Corrija as informações abaixo e tente novamente:</p>
  <ul>${listaErros}</ul>
  <a class="voltar" href="/">Voltar às instruções</a>
</body>
</html>
`;
}

app.get('/', (req, res) => {
  const { idade, sexo, salario_base, anoContratacao, matricula } = req.query;

  const temParametros = idade !== undefined || sexo !== undefined || salario_base !== undefined ||
    anoContratacao !== undefined || matricula !== undefined;

  if (!temParametros) {
    res.send(paginaInstrucoes());
    return;
  }

  const erros = validarDados(idade, sexo, salario_base, anoContratacao, matricula);
  if (erros.length > 0) {
    res.status(400).send(paginaErro(erros));
    return;
  }

  const resultado = calcularNovoSalario(idade, sexo, salario_base, anoContratacao);
  const dados = { idade, sexo, salario_base, anoContratacao, matricula };
  res.send(paginaResultado(dados, resultado));
});

app.listen(PORT, () => {
  console.log('Servidor rodando em http://localhost:' + PORT);
});
