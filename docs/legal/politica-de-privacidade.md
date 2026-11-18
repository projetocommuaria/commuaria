# Política de Privacidade da Plataforma Commuária — Minuta Acadêmica

> **Minuta acadêmica demonstrativa — não publicar como aviso vigente nem usar para tratar dados pessoais reais.** A versão do trabalho escolar utiliza somente dados fictícios. O texto descreve comportamentos encontrados no repositório e requisitos ainda a validar; não comprova configuração de produção, contratação municipal ou conformidade jurídica. Não constitui parecer jurídico.

- **Versão:** 1.0 — minuta acadêmica
- **Última revisão do rascunho:** 04/11/2026
- **Vigência jurídica:** não aplicável enquanto minuta acadêmica
- **Responsável pelo projeto:** Commuária — projeto acadêmico; identificação de pessoa jurídica responsável não informada nem confirmada para este exercício; equipe/instituição: [NOME DO GRUPO E DA ESCOLA, SE AUTORIZADO]
- **Canal de privacidade:** não configurado para o exercício; canal institucional a definir e usar somente se autorizado
- **Encarregado:** não designado para o exercício; aplicabilidade a avaliar em contexto real

## 1. Apresentação e escopo acadêmico

Este documento é um exemplo acadêmico de política para um projeto concebido para facilitar a comunicação entre cidadãos e administrações municipais por meio do registro e acompanhamento de ocorrências e atividades urbanas. **No exercício escolar não há contratação municipal nem prestação real de serviço; a demonstração deve usar somente dados fictícios e não deve coletar dados pessoais reais.** As cláusulas descrevem um cenário futuro hipotético ou comportamentos observados no código, conforme indicado; não são aviso de privacidade vigente nem comprovam que o sistema esteja implantado ou configurado para produção.

Em uma operação real, o tratamento deverá observar a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD) e os princípios aplicáveis. A leitura ou o aceite de uma política demonstra ciência das informações, mas não representa, por si só, consentimento para todo tratamento. Quando o consentimento for a base legal adequada, ele deverá ser solicitado separadamente e para finalidade determinada. Este texto é material escolar, não parecer jurídico.

## 2. Cenário ilustrativo e papéis no tratamento

Para fins deste exercício, não há município contratante nem tratamento de dados pessoais reais a que esta minuta se aplique; a demonstração poderá processar apenas registros fictícios. Em uma eventual operação futura, o modelo abrangeria cidadãos, funcionários municipais, supervisores, diretores, administradores e outras pessoas que utilizassem a plataforma.

Os papéis, se houver operação real, dependerão de cada tratamento:

- O **município** poderá ser controlador nas atividades em que define as finalidades e os meios essenciais do tratamento ligado à prestação de serviços públicos.
- A **Commuária** poderá ser operadora quando tratar dados em nome do município e conforme suas instruções legítimas e documentadas.
- A **Commuária** poderá ser controladora independente em atividades próprias, como determinadas operações contratuais, administrativas e de segurança, quando definir suas finalidades e meios essenciais.

A designação deverá corresponder às decisões e atividades efetivamente realizadas, e não apenas ao nome usado em um contrato. As condições específicas poderão ser detalhadas no instrumento de tratamento de dados celebrado com cada município.

## 3. Categorias de dados e mapeamento preliminar do código

O quadro abaixo separa campos identificados no repositório de dados que ainda dependem de configuração ou verificação. A presença de um campo no código não prova que tenha sido coletado em produção; os fluxos dependem de configuração e de eventual implantação.

| Categoria | Campos/elementos encontrados no código | Contexto e limite da verificação |
|---|---|---|
| Cadastro e perfil | Nome, e-mail, identificador de usuário, município (`city_id`), perfil/função e, conforme o fluxo, setor e permissões | O código contém cadastro e perfis de acesso. Ambiente real, campos obrigatórios e configuração não verificados. |
| Autenticação | E-mail e senha fornecidos no cadastro/login | Há integração de autenticação Supabase no código e fallback local. No fallback, os registros de usuário incluem campo de senha em `localStorage` e a comparação é direta; esse caminho não deve ser usado com credenciais reais. |
| Ocorrências | Título/descrição, categoria, endereço/localização, latitude/longitude, imagem (`image_url`), indicador de anonimato, identificadores/nome/e-mail associados, situação, notas de status e data de criação | O fluxo local grava a ocorrência em `localStorage` e tenta inseri-la no cliente Supabase quando configurado. A demonstração escolar deve substituir qualquer registro de exemplo por dados fictícios. |
| Operações municipais | Ordens de serviço e registros de atividades, atribuições, estados e atualizações operacionais | Os módulos de serviço e tipos do projeto incluem esses registros; conteúdo e retenção em operação real não verificados. |
| Preferências e notificações | Preferência de notificações no navegador; dados de destinatário e da ocorrência enviados no fluxo de e-mail | O código implementa notificações locais e uma chamada a uma rota do servidor; não comprova entrega real de e-mail. |
| Aceite dos Termos | Identificador do usuário autenticado, versão aceita e data/hora do aceite | O protótipo implementa versionamento e aceite. A migração `20261118192506_20261110210000_add_versioned_terms_acceptance.sql` foi aplicada ao projeto Supabase conectado à demonstração e teve seus objetos e permissões conferidos; não foi feito teste autenticado ponta a ponta nem validação para produção. No fallback, fica no armazenamento local deste navegador. |

### Fluxos técnicos identificados no repositório

- **Armazenamento local e autenticação:** há fallback que grava usuários, perfis, ocorrências, ordens e outros registros em `localStorage`. No caminho de autenticação local, a senha é mantida em campo próprio sem hash aparente e comparada diretamente. Isso é uma observação do código, não uma prática segura nem uma descrição de autenticação Supabase em produção. Use apenas credenciais fictícias no exercício.
- **Fotografias:** no fluxo de registro, a imagem selecionada é lida no navegador, redimensionada para no máximo 1000 × 1000 pixels e convertida em JPEG/base64; a ocorrência é gravada localmente e o campo da imagem é incluído na tentativa de inserção no Supabase. Nas rotas examinadas não foi localizada chamada de upload ao Supabase Storage. Isso não determina como uma futura implantação configurará imagens.
- **Mapa e geocodificação:** a interface solicita tiles a servidores do OpenStreetMap e faz consultas ao Nominatim para busca ou geocodificação reversa; a consulta reversa inclui coordenadas selecionadas e a busca usa texto de endereço/localidade. Tratamento, registros e retenção pelos serviços externos não foram verificados.
- **Projeção de ocorrências públicas:** a migração `supabase/migrations/20261110200647_activate_curitiba_auth_rls.sql` define a função `get_public_city_reports`. A projeção descrita nessa migração limita o retorno a até 250 registros, usa categorias permitidas e texto genérico, sanitiza o endereço e arredonda coordenadas a três casas decimais; o formato retornado não inclui o texto original nem `image_url`. **Não foi confirmado se a migração está aplicada em qualquer ambiente**; portanto, isso não é garantia de privacidade efetiva do protótipo ou de uma implantação.
- **Notificações:** há suporte a notificações do navegador/Service Worker e chamada do cliente a `/api/notifications/send-email`. O `server.ts` registra a tentativa em memória (até 100 entradas) e devolve `simulated: true`; o código examinado não comprova envio efetivo de e-mail.

Descrições e imagens podem conter incidentalmente dados de terceiros ou informações sensíveis. Em qualquer uso futuro, devem ser solicitadas apenas informações necessárias, com instruções para não inserir dados reais de terceiros na demonstração.

**Não verificado e a definir antes de qualquer operação real:** configuração efetiva e ambiente Supabase; implantação das migrações; região/localização dos dados; lista completa de fornecedores e suboperadores; registros de acesso; campos obrigatórios; cookies/analytics; tratamento de metadados de imagens; prazo de retenção e backups; moderação e canais de direitos; controles de acesso efetivamente ativos.

## 4. Finalidades e bases legais

Não há operação municipal contratada nem tratamento de dados pessoais reais no exercício; a demonstração poderá processar apenas dados fictícios. Nenhuma base legal foi definida para uma operação futura. Nesse cenário hipotético, as finalidades poderiam incluir cadastro e autenticação, vinculação municipal, registro e acompanhamento de ocorrências, gerenciamento de ordens de serviço, organização administrativa, comunicação, segurança e melhoria da plataforma.

Em uma operação real, a base legal deverá ser definida para cada tratamento pelo controlador responsável. Conforme o caso concreto, poderão ser aplicáveis hipóteses previstas na LGPD, como execução de contrato ou procedimentos preliminares, obrigação legal ou regulatória, execução de políticas públicas, legítimo interesse, consentimento ou exercício regular de direitos. Esta lista é apenas informativa e não determina automaticamente a base legal de qualquer tratamento.

O município deverá definir e documentar as bases legais das operações sob sua responsabilidade. Quando a Commuária atuar como controladora independente, deverá fazer o mesmo para suas próprias operações. O consentimento não será presumido como necessário para todas as funcionalidades.

## 5. Acesso e compartilhamento

O acesso deverá ser limitado às informações necessárias à função exercida e ao município correspondente. Dados de uma cidade não deverão ficar disponíveis a usuários de outra cidade, salvo hipótese legítima e autorizada.

Quando necessário às finalidades informadas, dados poderão ser acessados por:

- setores e profissionais autorizados do município responsável;
- profissionais da Commuária que necessitem de acesso para suporte, manutenção, segurança ou funcionamento, sob controles apropriados;
- fornecedores tecnológicos envolvidos na operação, nos limites do serviço contratado;
- autoridades públicas, quando houver obrigação ou fundamento legal.

Em uma operação futura, dados pessoais não deverão ser comercializados; fornecedores e demais destinatários deverão estar sujeitos a obrigações compatíveis de confidencialidade e proteção. Não há lista completa nem canal oficial de publicação definido para o exercício; fornecedores, serviços e transferências deverão ser inventariados e divulgados em canal institucional aprovado antes de qualquer operação real.

## 6. Mapa público e divulgação de ocorrências

O repositório contém uma função SQL destinada a fornecer uma projeção pública de ocorrências, descrita no mapeamento da seção 3. Essa função, se implantada e efetivamente usada, limita campos e generaliza parte das informações. A migração não foi confirmada como aplicada; também não foi verificado todo caminho de acesso ou a configuração de qualquer ambiente. Portanto, não se afirma que os dados da demonstração ou de uma futura implantação estejam efetivamente protegidos por essa projeção.

Em qualquer disponibilização pública futura, a identidade do cidadão — como nome, e-mail e dados de contato — não deverá ser exibida. Município e equipe deverão decidir, documentar e testar os campos, o tratamento de texto livre, imagens e precisão de localização, além de definir moderação e canal de pedidos de ocultação. A demonstração acadêmica deve conter exclusivamente dados fictícios.

## 7. Armazenamento, infraestrutura e fornecedores

O repositório contém código cliente do Supabase e roteamento municipal, além de caminhos de fallback em `localStorage`. Isso não confirma que um projeto Supabase esteja configurado ou implantado, quais dados estejam efetivamente transmitidos, a região de armazenamento, nem qualquer operação de produção. A interface também consulta serviços do OpenStreetMap/Nominatim, conforme descrito na seção 3.

Em uma operação real, a organização deverá identificar os fornecedores e serviços efetivamente utilizados, suas funções, dados acessados, suboperadores, localização e eventuais transferências internacionais; verificar contratos e condições de segurança; e informar os titulares conforme aplicável. A lista atual não pode ser completada apenas com as informações deste repositório. A utilização de fornecedores não elimina as responsabilidades de cada agente de tratamento.

## 8. Segurança da informação

Em uma operação real, a Commuária e cada município deverão adotar e verificar medidas técnicas e administrativas compatíveis com os dados, riscos e responsabilidades, tais como autenticação, controle de acesso, restrição por perfil e município, proteção de credenciais, cópias de segurança e resposta a incidentes. Este rascunho não certifica que esses controles estejam implementados.

**Ressalva técnica importante:** o fallback local identificado no código grava registros de usuários/perfis em `localStorage` e mantém/compara a senha em campo direto, sem hash aparente. Esse caminho é apenas uma implementação de demonstração e não deve receber credenciais ou dados reais nem ser descrito como controle seguro. A configuração e a segurança da autenticação Supabase em eventual ambiente não foram verificadas. A descrição pública deverá refletir somente controles testados e efetivamente implantados.

## 9. Retenção e eliminação

Não foram identificados no repositório prazos de retenção, política de expurgo ou ciclo de expiração de backups que possam ser afirmados nesta minuta. Em uma operação real, os prazos e critérios deverão ser definidos por categoria, finalidade, obrigações legais e instruções do controlador; não se deve prometer eliminação automática sem verificar os processos técnicos.

| Categoria | Critério ou prazo |
|---|---|
| Conta e dados cadastrais | Não verificado — a definir antes de operação real |
| Ocorrências e ordens de serviço | Não verificado — definir com o município e considerar regras de arquivo |
| Registros técnicos/notificações | Não verificado — identificar primeiro quais logs são mantidos e por quanto tempo |
| Cópias de segurança | Não verificado — definir ciclo, expiração e processo de restauração/eliminação |
| Dados contratuais da Commuária | Não aplicável no exercício; definir conforme obrigações em eventual operação real |

Após o término da finalidade, os dados deverão ser eliminados, anonimizados ou conservados somente quando houver hipótese legal aplicável e processo definido. A demonstração escolar deve usar apenas dados fictícios; a equipe deverá definir e executar uma rotina de limpeza dos registros locais de teste, sem apresentá-la como política formal de retenção.

## 10. Direitos dos titulares e solicitações

Nos termos da LGPD, os titulares poderão solicitar, conforme aplicável, confirmação do tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados, portabilidade, informação sobre compartilhamentos, revogação de consentimento e demais direitos previstos na lei.

O pedido deverá ser encaminhado ao agente responsável pela operação. Quando o município for controlador, caberá a ele avaliar e responder ao titular; a Commuária prestará suporte técnico e operacional dentro de suas atribuições. Para tratamentos em que a Commuária for controladora, ela responderá diretamente.

**Canal de privacidade no exercício:** não configurado; não há contato oficial de atendimento ou encarregado identificado no repositório. Em uma operação real, o canal, o procedimento de encaminhamento, a verificação de identidade e os prazos aplicáveis deverão ser definidos e publicados antes do início do tratamento. Não usar endereços administrativos/técnicos encontrados no código como canais oficiais sem aprovação expressa.

## 11. Armazenamento local, cookies e tecnologias semelhantes

O código observado usa `localStorage` do navegador para dados de demonstração, incluindo usuários/perfis, ocorrências, ordens de serviço, preferências, versões de Termos no modo local e respectivos aceites. `localStorage` é armazenamento no navegador e não deve ser confundido com cookie; sua duração, escopo e comportamento efetivos dependem do navegador e da implementação. Também há suporte a notificações do navegador/Service Worker e carregamento de mapas externos.

Não foi confirmado neste levantamento se há cookies, ferramentas de analytics/publicidade, tags de terceiros ou mecanismos de consentimento, nem suas finalidades e duração. Esses pontos devem ser inventariados antes de qualquer uso real. Para o trabalho escolar, utilizar apenas dados fictícios e remover dados de teste conforme um procedimento a ser definido pela equipe.

## 12. Crianças e adolescentes

A demonstração escolar deve usar somente perfis fictícios e não deve solicitar dados de crianças ou adolescentes reais. Idade mínima, procedimentos e medidas de proteção para eventual operação futura não estão definidos e deverão ser avaliados antes de qualquer oferta pública, à luz da LGPD, da legislação aplicável e do melhor interesse do titular.

## 13. Transferência internacional

A localização dos dados, os países de processamento/acesso e a existência de transferências internacionais não foram verificados. A presença de código cliente ou nomes de fornecedores não permite concluir a região de hospedagem. Em eventual operação real, esses fluxos e os mecanismos aplicáveis deverão ser identificados e avaliados conforme a LGPD e a regulamentação vigente antes da publicação.

## 14. Incidentes de segurança

Em eventual operação, as partes deverão manter procedimentos de identificação, registro, contenção e tratamento de incidentes. O prazo de até 24 horas aparece como proposta contratual na minuta acadêmica municipal que acompanha este documento; **não é compromisso vigente, prazo legal estabelecido por esta minuta nem prova de um canal de resposta implementado**. Prazo, canal e contatos deverão ser negociados e formalizados em contrato real.

O controlador avaliará e realizará as comunicações externas exigidas pela legislação e regulamentação vigentes. A operadora deverá fornecer as informações técnicas disponíveis e cooperar na investigação e mitigação. Prazos contratuais entre as partes não substituem prazos legais aplicáveis ao controlador.

## 15. Alterações e contatos

Esta minuta acadêmica poderá ser atualizada para refletir o trabalho escolar e não é aviso vigente para usuários. O protótipo agora possui fluxo para publicar versões dos Termos e registrar aceites; no Supabase, esse fluxo depende da migração indicada na seção 3, e no modo local os registros permanecem neste navegador. Isso não comprova implantação em produção nem transforma esta minuta acadêmica em política operacional. Em operação real, a organização responsável deverá definir como comunicar mudanças relevantes e quando solicitar consentimento específico, conforme a finalidade e a base legal.

- **Responsável legal por serviço real:** identificação não informada nem confirmada para este exercício; não presumir pessoa ou entidade
- **Canal público de privacidade/atendimento:** não configurado; contato institucional somente se autorizado pela equipe/escola
- **Encarregado:** não designado para o exercício; aplicabilidade a avaliar em operação real
- **Município controlador:** não há município contratante neste modelo acadêmico

**Commuária — Uma cidade melhor começa com você.**
