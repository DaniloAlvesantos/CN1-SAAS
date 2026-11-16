CN1 SaaS — Saúde e Bem-Estar | Grupo D

Projeto de Computação em Nuvem da Fatec Itapira. O painel reúne três funções serverless para uma demonstração acadêmica de triagem nutricional: índices corporais, metas calóricas e hidratação.

- [Dashboard publicado](https://cn-1-saas.vercel.app)
- [Repositório do grupo](https://github.com/DaniloAlvesantos/CN1-SAAS)

## Arquitetura

O usuário preenche o formulário no frontend Next.js, hospedado na **Vercel**. O navegador envia requisições HTTPS com JSON para **Supabase Edge Functions** e **Google Cloud Run** em paralelo. Depois que essas chamadas terminam, o frontend envia a TMB obtida do Supabase, ou calculada localmente em caso de falha, à **AWS Lambda**.

| Serviço | Responsabilidade | Código |
| --- | --- | --- |
| Vercel | Formulário, chamadas aos serviços e exibição dos resultados | [frontend-app](frontend-app/) |
| Supabase Edge Functions | Cálculo de IMC, classificação e TMB | [PR do Supabase](https://github.com/DaniloAlvesantos/CN1-SAAS/pull/1) |
| AWS Lambda | Meta calórica e distribuição de macronutrientes | [aws-lambda](aws-lambda/) |
| Google Cloud Run | Estimativa de hidratação, horas de sono e recomendação | [google-functions](google-functions/) |

## Endpoints

Todas as chamadas abaixo usam `POST` e `Content-Type: application/json`. Para o Supabase e o Cloud Run, use a URL da implantação correspondente no ambiente do frontend.

| Serviço | URL no frontend | Exemplo de entrada | Exemplo de saída |
| --- | --- | --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE` | `{"weight":70,"height":1.75,"age":30,"gender":"male"}` | `{"imc":22.86,"classification":"Peso normal","tmb":1648.75}` |
| AWS Lambda | `NEXT_PUBLIC_AWS` | `{"tmb":1600,"activity_level":1.55,"objective":"maintenance"}` | `{"calories":2480,"proteins":155,"carbs":310,"fats":69}` |
| Google Cloud Run | `NEXT_PUBLIC_GOOGLE_CLOUD` | `{"wight":70,"intensity":"light"}` | `{"water_liters":2950,"sleep_hours":8,"recommendation":"Treino leve concluido. Mantenha a hidratacao constante."}` |

- A [Function URL da AWS](https://cufzo4azykrh6kn7mivu4rzmiy0fcten.lambda-url.us-east-2.on.aws/) recebe a TMB em kcal/dia. A resposta usa kcal/dia para a meta calórica e g/dia para os macros. Os objetivos aceitos são `deficit`, `maintenance` e `hypertrophy`.
- O código do Cloud Run na `main` usa a chave `wight`. O frontend envia tanto `weight` quanto `wight` por compatibilidade. Nessa versão do código, `water_liters` recebe o valor calculado em **mL**, embora o nome indique litros. Para apresentar o resultado em litros, o valor deve ser dividido por 1.000. O exemplo da tabela reflete o código na `main`.

## Executar o frontend localmente

1. Clone o repositório e instale as dependências com Node.js e npm.

   ```bash
   git clone https://github.com/DaniloAlvesantos/CN1-SAAS.git
   cd CN1-SAAS
   npm ci
   ```

2. Crie `frontend-app/.env.local` com as URLs completas dos serviços. Os valores de exemplo para Supabase e Cloud Run devem ser substituídos pelas URLs da equipe.

   ```dotenv
   NEXT_PUBLIC_SUPABASE=URL_DA_EDGE_FUNCTION
   NEXT_PUBLIC_AWS=https://cufzo4azykrh6kn7mivu4rzmiy0fcten.lambda-url.us-east-2.on.aws/
   NEXT_PUBLIC_GOOGLE_CLOUD=URL_DO_CLOUD_RUN
   ```

3. Inicie o painel com `npm run dev --workspace frontend-app` e abra [localhost:3000](http://localhost:3000). Para testar a integração no navegador local, inclua essa origem no CORS dos endpoints cuja configuração esteja restrita ao domínio de produção.

Na Vercel, configure as três variáveis no ambiente **Production** e faça um novo deploy. O passo a passo da AWS está no [README da Lambda](aws-lambda/README.md).

## Testes e demonstração

- **Fluxo normal.** Abra o dashboard publicado, envie dados fictícios e confira os três cards.
- **Falha do Cloud Run.** No DevTools, bloqueie apenas as chamadas ao endpoint de hidratação e reenvie o formulário. O card de hidratação deve indicar indisponibilidade, enquanto Supabase e AWS continuam exibindo os resultados.
- **Falha do Supabase.** Remova o primeiro bloqueio, bloqueie apenas o endpoint do Supabase e repita. O frontend calcula IMC e TMB localmente e usa a TMB de contingência na chamada à AWS.
- **Logs.** Remova os bloqueios, envie o formulário novamente e localize as chamadas pelo horário nos logs da Edge Function, do CloudWatch e do Cloud Run.
- **Teste isolado da AWS.** No console da Lambda, execute o [evento de manutenção](aws-lambda/evento-teste.json). O resultado esperado está na tabela de endpoints.

O código atual trata falhas de requisição. O timeout explícito no frontend segue pendente.

## Latência observada no dashboard

Uma primeira rodada e três repetições com os mesmos dados fictícios, conforme a apresentação do grupo. Tempos em milissegundos.

| Serviço | Primeira rodada | Repetições | Mediana das repetições |
| --- | ---: | --- | ---: |
| Supabase Edge Functions | 430 | 36 / 108 / 181 | 108 |
| AWS Lambda | 1.149 | 185 / 165 / 182 | 182 |
| Google Cloud Run | 267 | 25 / 43 / 27 | 27 |

A primeira rodada mede a latência inicial observada no dashboard. Para confirmar um *cold start*, é necessário associar a chamada aos logs de inicialização do serviço.

## Estimativa mensal

Cenário de **1 milhão de avaliações**, com uma chamada a cada função por avaliação. Valores em dólares dos EUA, conforme a simulação da apresentação.

| Serviço | Estimativa | Premissa |
| --- | ---: | --- |
| Supabase Pro | US$ 25,00 | 1 milhão de invocações dentro da franquia considerada |
| AWS Lambda | US$ 0,66 | Ohio, x86, 128 MiB estimados e 219 ms faturados por invocação como referência, antes da franquia gratuita |
| Google Cloud Run | US$ 25,84 | São Paulo, 1 vCPU, 512 MiB, 400 ms e uma instância mínima |
| Vercel Pro | US$ 20,00 | Mensalidade base considerada na simulação |
| **Total de referência** | **US$ 71,50** | Antes de impostos, tráfego adicional e excedentes |

Para a AWS, os 219 ms vieram de um único teste no console. A estimativa usa essa duração como referência para a simulação, e a latência do dashboard foi medida separadamente. [Calculadora de preços da AWS](https://calculator.aws/)
