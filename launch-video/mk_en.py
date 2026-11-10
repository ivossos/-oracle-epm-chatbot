import re,sys
h=open('index.html',encoding='utf-8').read()
R=[
('<html lang="pt-BR">','<html lang="en">'),
('<title>EPM Copilot — vídeo de lançamento</title>','<title>EPM Copilot — launch video</title>'),
# S1
('>Fechamento · Realizado × Orçado</div>','>Close · Actual vs. Budget</div>'),
('data-in="2.2" data-anim="fade">Tempo até a resposta','data-in="1.8" data-anim="fade">Time to answer'),
('data-in="0.45" data-cps="26">Por que o OPEX ficou 7,4% acima do orçado?','data-in="0.4" data-cps="30">Why did OPEX come in 7.4% above budget?'),
('data-in="2.2"><b>01</b>Abrir o Smart View','data-in="1.8"><b>01</b>Open Smart View'),
('data-in="2.7"><b>02</b>Navegar dimensões','data-in="2.2"><b>02</b>Navigate dimensions'),
('data-in="3.2"><b>03</b>Cruzar versões','data-in="2.6"><b>03</b>Reconcile versions'),
('data-in="3.7"><b>…</b>Horas depois, uma resposta','data-in="3.0"><b>…</b>Hours later, one answer'),
('clamp((lt-2.2)/2.2)','clamp((lt-1.8)/1.9)'),
# S2
('>O problema</div>','>The problem</div>'),
('Três gargalos que nenhum relatório novo resolve','Three bottlenecks no new report will fix'),
('Variação Realizado × Orçado leva horas','Actual vs. Budget variance takes hours'),
('Smart View, dimensões e versões para responder uma pergunta de uma frase.','Smart View, dimensions and versions to answer a one-sentence question.'),
('data-in="2.9"><div class="n">02</div><div class="t">Comentários de fechamento refeitos na mão','data-in="2.6"><div class="n">02</div><div class="t">Close commentary is rebuilt by hand'),
('Todo mês, a narrativa é remontada a partir de exports colados em planilhas.','Every month the narrative is reassembled from cube exports pasted into spreadsheets.'),
('data-in="6.7"><div class="n">03</div><div class="t">O conhecimento fica com 1–2 pessoas','data-in="6.0"><div class="n">03</div><div class="t">The knowledge sits with 1–2 people'),
('Hierarquias, contas e centros de resultado vivem na cabeça de poucos especialistas.','Hierarchies, accounts and cost centres live in a few specialists’ heads.'),
# S3
('data-in="1.6" data-anim="line" data-dur="0.9"></div>','data-in="1.4" data-anim="line" data-dur="0.9"></div>'),
('data-in="2.5">Agentes de IA para o <i>Oracle EPM</i>','data-in="2.3">Ask your EPM in <i>plain language</i>'),
('data-in="3.1" data-anim="fade">FCCS · PLANNING','data-in="2.9" data-anim="fade">FCCS · PLANNING'),
# S4
('>Como funciona</div>','>How it works</div>'),
('Uma pergunta, a resposta e os números por trás','One question, the answer, and the numbers behind it'),
('<span>Conectar</span>','<span>Connect</span>'),('<span>Perguntar</span>','<span>Ask</span>'),('<span>Analisar</span>','<span>Analyse</span>'),('<span>Automatizar</span>','<span>Automate</span>'),
('FCCS · EXEMPLO ILUSTRATIVO</div>','FCCS · ILLUSTRATIVE EXAMPLE</div>'),
('data-in="1.0" data-cps="24">Explique por que o OPEX ficou 7,4% acima do orçado no Q3.','data-in="0.9" data-cps="26">Explain why OPEX came in 7.4% above budget in Q3.'),
('data-in="4.1" data-anim="fade" style="margin-top:26px">&lt; RESPOSTA ILUSTRATIVA','data-in="3.5" data-anim="fade" style="margin-top:26px">&lt; ILLUSTRATIVE ANSWER'),
('O desvio de <em>7,4%</em> concentra-se em dois drivers — serviços profissionais e manutenção predial no Sudeste — parcialmente compensado por economia em viagens.','The <em>7.4%</em> variance concentrates in two drivers — professional services and facilities maintenance in the South-East — partially offset by travel savings.'),
('data-in="6.3" data-anim="fade"><div class="name">Serviços profissionais','data-in="5.6" data-anim="fade"><div class="name">Professional services'),
('data-in="6.4" data-anim="line"','data-in="5.7" data-anim="line"'),
('data-in="6.7" data-anim="fade"><div class="name">Manutenção predial · SE','data-in="5.9" data-anim="fade"><div class="name">Facilities maint. · SE'),
('data-in="6.8" data-anim="line"','data-in="6.0" data-anim="line"'),
('data-in="7.1" data-anim="fade"><div class="name">Viagens','data-in="6.2" data-anim="fade"><div class="name">Travel'),
('data-in="7.2" data-anim="line"','data-in="6.3" data-anim="line"'),
('+R$ 1,9 mi','+$1.9M'),('+R$ 0,8 mi','+$0.8M'),('−R$ 0,6 mi','−$0.6M'),
('class="stats" data-in="7.6"','class="stats" data-in="6.7"'),
('id="st1">+7,4%','id="st1">+7.4%'),('VARIAÇÃO OPEX','OPEX VARIANCE'),('DRIVERS PRINCIPAIS','MAIN DRIVERS'),
('<div class="v">Exemplo</div><div class="l">NÃO É BENCHMARK','<div class="v">Illustrative</div><div class="l">NOT A BENCHMARK'),
('Exemplo ilustrativo · os valores são fictícios','Illustrative example · the values are fictional'),
('clamp((lt-4.4)*8.5','clamp((lt-3.8)*8.5'),
("hl('how2',0.9,4.0); hl('how3',4.1,99)","hl('how2',0.9,3.4); hl('how3',3.5,99)"),
('eo((lt-7.6)/1.0)','eo((lt-6.7)/1.0)'),
(".toFixed(1).replace('.',',')+'%'",".toFixed(1)+'%'"),
# S5
('>Produto</div>','>Product</div>'),
('Três copilotos, cada um dentro do seu módulo','Three copilots, each inside its own module'),
('class="card" data-in="1.5"><div class="top" data-in="3.45"','class="card" data-in="1.3"><div class="top" data-in="3.45"'),
('class="card" data-in="1.8"><div class="top" data-in="4.25"','class="card" data-in="1.55"><div class="top" data-in="4.5"'),
('class="card" data-in="2.1"><div class="top" data-in="5.0"','class="card" data-in="1.8"><div class="top" data-in="5.15"'),
('Consolidação e fechamento, explicados em tempo real.','Consolidation and close, explained in real time.'),
('Orçamento, forecast e cenários em conversa, direto no cubo.','Budget, forecast and scenarios in conversation, straight in the cube.'),
('Rentabilidade e rateio de custos, rastreados até o driver.','Profitability and cost allocation, traced down to the driver.'),
('data-in="2.6" data-anim="fade">Nativo no Oracle EPM','data-in="2.3" data-anim="fade">Native to Oracle EPM'),
# S6
('>Segurança e governança</div>','>Security &amp; governance</div>'),
('Seus dados continuam sob o seu controle','Where the data stays, who reaches it, what gets logged'),
('<div class="t">Implantado no seu ambiente</div><div class="d">O agente roda dentro do ambiente do cliente, definido junto ao seu time de TI.','<div class="t">Deployed inside your environment</div><div class="d">Technical evaluation defines where the agent and AI models run.'),
('class="it" data-in="2.6"','class="it" data-in="2.3"'),
('<div class="t">Respeita as permissões do EPM</div><div class="d">Ninguém vê o que não podia ver antes.','<div class="t">Scoped to existing EPM provisioning</div><div class="d">The access scope is validated with IT before operation.'),
('class="it" data-in="4.5"','class="it" data-in="4.6"'),
('<div class="t">Trilha de auditoria por consulta</div><div class="d">Cada pergunta e cada resposta ficam registradas, com usuário, data e dados consultados.','<div class="t">Full audit trail per query</div><div class="d">Logged events, retention and audit export defined for your deployment.'),
# S7
('<div class="l1" data-in="0.5">Feche mais rápido.</div>','<div class="l1" data-in="0.45">Close in days</div>'),
('<div class="l2" data-in="2.1">Entenda cada variação<br>em segundos<u>.</u></div>','<div class="l2" data-in="1.9">answers in seconds<u>.</u></div>\n    <div class="l1" data-in="3.5">No spreadsheets.</div>'),
('Solicitar demonstração','Request a demo'),
# timeline
("const TL = { total: 54.5, scenes: [\n  {id:'s1', start:0}, {id:'s2', start:4.65}, {id:'s3', start:15.2}, {id:'s4', start:20.5},\n  {id:'s5', start:30.4}, {id:'s6', start:36.55}, {id:'s7', start:43.65}",
 "const TL = { total: 47.8, scenes: [\n  {id:'s1', start:0}, {id:'s2', start:3.88}, {id:'s3', start:12.27}, {id:'s4', start:16.54},\n  {id:'s5', start:25.3}, {id:'s6', start:31.18}, {id:'s7', start:37.67}"),
]
for a,b in R:
    if h.count(a)!=1: sys.exit('MISS(%d): %s'%(h.count(a),a[:70]))
    h=h.replace(a,b)
left=re.findall(r'[^<>\n]*[ãçõéêíóúáâ][^<>\n]*',h)
print('non-ascii leftovers:',[x.strip()[:60] for x in left if 'font' not in x])
open('index-en.html','w',encoding='utf-8').write(h)
