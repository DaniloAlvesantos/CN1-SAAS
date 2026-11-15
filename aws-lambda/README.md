# AWS Lambda do Grupo D

1. No console do **AWS Lambda**, criamos a função `grupo-d-metas-caloricas` do zero, na região **Ohio (`us-east-2`)**, com o runtime **Node.js 26.x**.
2. Na aba **Código**, substituímos o conteúdo de [index.mjs](index.mjs) pelo código da função e clicamos em **Deploy**.
3. Na aba **Testar**, criamos o evento privado e síncrono `teste-manutencao` com o conteúdo de [evento-teste.json](evento-teste.json). O teste retornou `statusCode: 200`, com 2.480 kcal, 155 g de proteína, 310 g de carboidratos e 69 g de gordura.
4. Em **Configuração → URL da função → Editar**, selecionamos autenticação `NONE` e modo de invocação `BUFFERED`. Ativamos o CORS e permitimos a origem `https://cn-1-saas.vercel.app`, o método `POST` e o cabeçalho `content-type`. Salvamos e copiamos a URL gerada.
5. **Pendente na Vercel.** O responsável pelo frontend deve salvar a URL na variável `NEXT_PUBLIC_AWS` do ambiente **Production**, fazer o redeploy e confirmar o resultado no card **AWS Lambda**.
