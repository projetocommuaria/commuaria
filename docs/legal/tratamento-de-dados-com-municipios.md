# Modelo Acadêmico de Política de Tratamento e Proteção de Dados entre a Commuária e os Municípios

> **Modelo acadêmico genérico de tratamento de dados — não é contrato, não assinar nem publicar como política vigente.** O trabalho escolar usa somente dados fictícios; não há contratação municipal nem operação real representada por este documento. Os campos e obrigações abaixo são exemplos para eventual cenário futuro e dependem de validação jurídica, técnica e contratual. A classificação dos agentes deve corresponder às operações efetivas.

- **Versão:** 1.0 — minuta acadêmica
- **Última revisão do rascunho:** 04/11/2026
- **Vigência contratual:** não aplicável no exercício
- **Responsável pelo projeto:** Commuária — projeto acadêmico; identificação de pessoa jurídica responsável não informada nem confirmada
- **Aplicação:** modelo municipal genérico; não há município contratante nesta versão

## 1. Objetivo e limites do modelo

Este documento é um modelo acadêmico genérico para ilustrar como poderiam ser organizadas responsabilidades de tratamento entre uma plataforma e um município em uma contratação futura. **Não estabelece relação entre a Commuária e qualquer município, não constitui instrução de tratamento e não cria obrigação contratual.** O exercício não envolve prestação real de serviço nem dados pessoais reais.

Em eventual contratação, as condições específicas de cada operação precisariam constar de instrumento próprio, incluindo finalidades, categorias de dados e titulares, instruções, prazos, medidas e contatos, após validação jurídica, técnica e administrativa.

## 2. Abrangência

O escopo hipotético deste modelo poderia abranger a pessoa/entidade que viesse a operar a plataforma, município contratante e pessoas autorizadas, como cidadãos, funcionários, supervisores, diretores, administradores municipais e profissionais de suporte. Para este exercício, não há município ou fornecedor contratante identificado.

Uma operação futura deveria respeitar as competências do município, as configurações efetivamente implantadas e as condições do contrato específico. A existência de código para funcionalidades municipais não prova que tais funcionalidades estejam contratadas, ativas ou seguras.

## 3. Papéis e responsabilidades por operação

As descrições abaixo são alternativas para um cenário futuro e não classificam juridicamente nenhuma operação do exercício, pois não há tratamento municipal real. A definição de controlador e operador considera quem determina as finalidades e os meios essenciais de cada operação; a denominação contratual, isoladamente, não determina o papel.

### 3.1. Município como controlador

Quando definir as finalidades e os meios essenciais do tratamento relacionado à prestação de serviços públicos, o município atuará como controlador. Caberá ao município, entre outras obrigações:

- definir e documentar finalidades e hipóteses legais;
- determinar quais dados são necessários às atividades públicas;
- fornecer transparência adequada aos titulares;
- atender solicitações de titulares referentes às operações sob sua responsabilidade;
- fornecer instruções legítimas e documentadas à Commuária;
- controlar os acessos de seus profissionais e rever permissões;
- avaliar comunicações externas de incidentes, quando exigidas;
- manter registros das operações sob sua responsabilidade.

### 3.2. Commuária como operadora

Quando tratar dados em nome do município e conforme instruções legítimas e documentadas, a Commuária atuará como operadora. Deverá:

- limitar o tratamento à execução dos serviços e às instruções recebidas;
- restringir o acesso a profissionais que necessitem dos dados;
- exigir confidencialidade e adotar medidas de segurança compatíveis;
- auxiliar o município, dentro de suas atribuições, em solicitações de titulares e obrigações de segurança;
- notificar incidentes conforme a seção 8 e o contrato;
- informar o município sobre instruções que aparentem conflitar com a legislação;
- devolver, eliminar ou conservar dados conforme instruções e obrigações aplicáveis ao encerramento.

### 3.3. Commuária como controladora independente

A Commuária poderá atuar como controladora independente em operações próprias, quando determinar suas finalidades e meios essenciais, como determinadas atividades de administração contratual, relacionamento comercial, cumprimento de obrigações legais ou proteção de direitos. Nesses casos, deverá definir a hipótese legal aplicável e cumprir as obrigações correspondentes.

A Commuária poderá ser operadora em uma atividade e controladora em outra. A avaliação deverá ser feita por operação e documentada quando necessário.

## 4. Finalidades, categorias e mapeamento técnico

Em um cenário futuro, as finalidades poderiam incluir cadastro e autenticação, registro e acompanhamento de ocorrências, encaminhamento a setores, gerenciamento de ordens de serviço, comunicação, segurança e funcionamento da plataforma. **Não há finalidades de tratamento municipal aprovadas para este exercício.** O município controlador deverá definir a necessidade, adequação e base legal para cada operação real.

O repositório contém referências às seguintes categorias: nome, e-mail, identificadores e perfis de usuário; município/setor e permissões; credenciais; ocorrências com título/descrição, categoria, endereço, coordenadas, imagem, indicador de anonimato, usuário associado, situação e data; ordens de serviço e atualizações operacionais; dados de destinatários usados no fluxo de notificações; e registro de versão/data do aceite dos Termos associado à conta autenticada. O registro dos Termos é compartilhado entre municípios no modelo do projeto e não deve ser presumido como operação municipal contratada. A existência desses campos no código não prova coleta em produção.

### Verificações técnicas do repositório — não são garantias de operação

- O cliente inclui integração Supabase e roteamento municipal. Também há fallback que grava usuários, perfis, ocorrências e ordens em `localStorage`; no fallback de autenticação, a senha é armazenada em campo direto e comparada diretamente, sem hash aparente. É comportamento observado no código, inadequado para credenciais reais; utilizar somente contas fictícias no exercício.
- O fluxo de ocorrência lê imagem no navegador, redimensiona para no máximo 1000 × 1000 pixels, converte para JPEG/base64, grava cópia local e tenta inserir os dados no Supabase quando o cliente está configurado. Nas rotas examinadas não foi localizada chamada de upload ao Supabase Storage.
- A migração `20261118192506_20261110210000_add_versioned_terms_acceptance.sql` cria tabelas compartilhadas para versões dos Termos e aceites por usuário/versão/data. A publicação é feita por função que verifica ADM Global e o aceite usa a identidade autenticada. No fallback local, versões e aceites são guardados em `localStorage`. A migração foi aplicada ao projeto Supabase conectado à demonstração, e foram conferidos o seed demonstrativo, as tabelas, as políticas RLS, as permissões das RPCs e a publicação Realtime. Não foi feito um teste autenticado ponta a ponta nem isso implica implantação ou validação para uso em produção.
- Uma migração SQL define a função `get_public_city_reports`, que retorna uma projeção limitada: até 250 registros, categorias permitidas, texto genérico, endereço sanitizado e coordenadas arredondadas a três casas decimais; não retorna o texto original nem `image_url`. Não foi confirmado se a migração está aplicada, nem se todos os caminhos de acesso a utilizam; a definição da função, por si só, não garante proteção dos dados em um ambiente implantado.
- A interface carrega tiles do OpenStreetMap e faz consultas ao Nominatim para busca/geocodificação; também há notificações locais do navegador/Service Worker e uma rota `/api/notifications/send-email`. O servidor registra tentativas em memória, até 100 entradas, e marca a resposta como simulada; não foi comprovado envio real de e-mail.

A configuração completa do Supabase e a localização de todos os dados, a aplicação das demais migrações, a lista de fornecedores/suboperadores, a efetividade de todos os controles de acesso, registros, backups, retenção, tratamento de metadados e eventual transferência internacional não foram auditados. A migração dos Termos aplicada à demonstração não verifica esses outros aspectos. Os itens e as categorias efetivamente tratados deverão ser confirmados e preenchidos no Anexo I antes de qualquer operação real.

## 5. Separação municipal e controle de acesso

Em uma implantação futura, a separação lógica entre ambientes deverá ser projetada e testada para impedir acesso indevido entre municípios. O repositório contém roteamento por município, mas sua configuração, controles de acesso e efetividade não foram auditados nem verificados em ambiente implantado. O compartilhamento entre municípios não deverá ser automático e dependerá de finalidade, fundamento e autorização aplicáveis.

Em uma contratação real, o acesso deverá respeitar perfil, município, setor e atividade autorizada. A configuração de **ADM** deverá indicar claramente se o escopo é municipal ou global. Qualquer acesso técnico deverá ser justificado, limitado e registrado quando tecnicamente aplicável; não deverá autorizar consulta indiscriminada.

O município contratante deverá conceder, revisar e revogar permissões de seus usuários e comunicar mudanças de vínculo ou função, conforme condições do contrato. No exercício não há município que execute essas atividades.

## 6. Segurança e confidencialidade

Em eventual operação, as partes deverão adotar e testar medidas técnicas e administrativas proporcionais aos dados e riscos, como autenticação, controle de acesso, separação lógica de ambientes, proteção de credenciais, registros, backups e resposta a incidentes. **Este modelo não comprova que essas medidas estejam implementadas.** O fallback de autenticação local descrito na seção 4 mantém senha em campo direto e não deve ser usado com credenciais reais.

A documentação de uma contratação futura deverá refletir somente medidas verificadas; cada parte deverá orientar seus profissionais e limitar acessos ao necessário. Confidencialidade, responsabilidades e duração das obrigações deverão ser definidos no contrato real.

## 7. Fornecedores e suboperadores

O código do projeto contém integração com Supabase e consultas aos serviços do OpenStreetMap/Nominatim. Isso não confirma quais serviços ou contas estão ativos, se há contrato com esses fornecedores, quais dados são transmitidos em qualquer ambiente, sua região, nem se existem outros fornecedores/suboperadores.

Em eventual contratação, a pessoa/entidade operadora deverá identificar os fornecedores efetivamente utilizados, serviços, dados acessados, suboperadores, regiões e eventuais transferências; informar o município e verificar segurança e bases contratuais. A lista não pode ser completada com segurança apenas a partir do repositório.

**Fornecedores do ambiente contratado:** não aplicável no exercício; a identificar e validar no Anexo I antes de qualquer operação real.

## 8. Incidentes de segurança

Em eventual contratação, as partes deverão definir procedimentos para identificar, registrar, conter e tratar incidentes e canal de notificação. O prazo de **até 24 (vinte e quatro) horas após a identificação** é uma proposta deste modelo acadêmico para discussão contratual, não é compromisso vigente, prazo legal estabelecido por esta minuta nem prova de um canal de plantão ativo. Só terá efeito se for negociado e incluído em instrumento firmado.

Em cenário futuro, o contrato poderá definir informações iniciais e complementares a compartilhar, responsabilidades de investigação e cooperação. O controlador avaliará as comunicações externas exigidas pela legislação e regulamentação vigentes; eventuais prazos contratuais entre as partes não os substituem.

**Canal e contatos de plantão:** não configurados no exercício; a definir e testar antes de operação real.

## 9. Direitos dos titulares

Quando o município for controlador, caberá a ele avaliar e responder solicitações relativas às operações sob sua responsabilidade. A Commuária prestará suporte técnico e operacional, conforme as instruções legítimas do município, para localizar, consultar, corrigir, exportar, bloquear ou eliminar dados quando aplicável.

Nas operações em que a Commuária atuar como controladora independente, responderá diretamente ao titular. O canal e o procedimento para encaminhamento de pedidos entre as partes deverão constar do contrato e da Política de Privacidade.

## 10. Retenção, devolução e eliminação

O repositório não define prazos de retenção, expurgo, backups ou eliminação que possam ser assumidos nesta minuta. Em uma operação real, o município deverá estabelecer requisitos para dados sob sua responsabilidade e a entidade operadora deverá documentar prazos, instruções e processos técnicos, observadas as obrigações aplicáveis.

O encerramento de uma ocorrência ou ordem de serviço não determina, por si só, eliminação imediata. Um contrato futuro deverá definir exportação/devolução, eliminação, anonimização ou conservação autorizada ao término do serviço, incluindo ciclo de backups e medidas contra uso incompatível.

**Retenção e eliminação no exercício:** não aplicável a dados pessoais reais; utilizar somente registros fictícios. Critérios técnicos de limpeza do ambiente de demonstração devem ser definidos pela equipe, sem serem apresentados como política de produção.

## 11. Transferência internacional

Não foi confirmada a localização dos dados nem se há armazenamento, processamento ou acesso fora do Brasil. A configuração do repositório, isoladamente, não informa essa localização. Em eventual operação, fornecedores, países/regiões e mecanismos jurídicos deverão ser identificados e avaliados conforme a LGPD e a regulamentação aplicável antes do início do tratamento.

## 12. Auditoria e cooperação

O município poderá solicitar informações e evidências razoáveis sobre as medidas relacionadas ao tratamento contratado, respeitando a confidencialidade, a segurança da plataforma e os direitos de outros municípios. Forma, escopo, periodicidade e procedimento de auditoria deverão ser definidos no contrato.

As partes cooperarão em fiscalizações, solicitações da ANPD e demais procedimentos relacionados à proteção de dados, dentro de suas atribuições e obrigações legais.

## 13. Alterações e prevalência contratual

Este modelo acadêmico poderá ser atualizado para fins do trabalho escolar. Em uma relação futura, mudanças relevantes nas finalidades, papéis ou condições de tratamento deverão ser comunicadas e formalizadas nos instrumentos apropriados, após validação.

Não há condições contratuais assinadas neste exercício. Em eventual contratação, a hierarquia entre contrato e anexo de tratamento deverá ser definida expressamente, sem afastar a legislação aplicável. Este modelo não substitui contrato comercial ou anexo negociado.

## 14. Identificação, condições específicas e formalização

Este anexo é um modelo genérico. **No exercício escolar, os dados abaixo são não aplicáveis: não inserir dados reais, não indicar um município como contratante e não assinar.** Uma eventual contratação real exigiria identificação completa das partes e validação jurídica e operacional; campos não confirmados devem permanecer explicitamente pendentes.

### Anexo I — Quadro da operação (modelo; não vigente)

**A. Município contratante**

- Município: não aplicável no exercício; identificar somente em futura contratação real
- CNPJ e órgão responsável: não informado/não aplicável ao exercício; confirmar no instrumento futuro
- Controlador e contato institucional: não aplicável ao exercício; definir pelo município contratante
- Encarregado/canal de privacidade: não aplicável ao exercício; confirmar e aprovar antes de operação real

**B. Commuária / responsável pelo projeto**

- Razão social/nome e CNPJ: não informados nem confirmados para este exercício; não presumir entidade ou CNPJ
- Representante legal: não identificado para o exercício; preencher somente se houver entidade legal responsável e autorização
- Controlador/operador e contato para contratação: não aplicável no exercício; classificar por operação em futuro contrato
- Encarregado ou canal de privacidade: não configurado para o exercício; definir e confirmar quando aplicável

**C. Operações e dados**

| Item | Condição específica |
|---|---|
| Finalidades e instruções do município | Não aplicável no exercício; definir pelo controlador em futura contratação |
| Serviços e funcionalidades contratados | Não há contratação neste exercício; definir em contrato futuro |
| Categorias de titulares e dados | Para demonstração, somente registros fictícios; categorizar e confirmar antes de operação real |
| Perfis, setores e permissões autorizados | Não aplicável no exercício; mapear e testar antes de implantação |
| Fornecedores/suboperadores, serviços e regiões | Supabase e OpenStreetMap/Nominatim são referências no código; ambiente, contratos, escopo e região não verificados; validar lista completa |
| Bases legais sob responsabilidade do controlador | Não há base definida no exercício; definir por operação em contexto real |
| Prazos e critérios de retenção | Não verificados; definir por categoria, finalidade e obrigação aplicável |
| Canal e prazo contratual de incidente | Canal não configurado; prazo de até 24h é apenas proposta acadêmica, sem vigência contratual |
| Procedimento de exportação, devolução e eliminação | Não verificado; definir antes de eventual contratação |
| Cópias de segurança e ciclo de expiração | Não verificados; definir e testar antes de operação real |
| Auditoria e evidências | Não aplicável no exercício; negociar escopo e procedimento no contrato futuro |
| Transferência internacional, se houver | Países/regiões e mecanismos não verificados; apurar antes de operação real |

**D. Formalização — somente em eventual contratação real**

Os campos de local, data e assinaturas abaixo são apenas parte do modelo; não preencher nem assinar para o exercício escolar.

Local e data: [NÃO APLICÁVEL NO EXERCÍCIO]

Representante do município: [A IDENTIFICAR E VALIDAR EM CONTRATAÇÃO FUTURA]

Representante da Commuária: [A IDENTIFICAR E VALIDAR EM CONTRATAÇÃO FUTURA]

Assinaturas: [NÃO APLICÁVEL NO EXERCÍCIO]

**Commuária — Uma cidade melhor começa com você.**
