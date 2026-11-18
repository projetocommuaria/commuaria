export interface TermsDocument {
  version: number;
  title: string;
  content: string;
  published_at: string;
  is_current?: boolean;
}

export const TERMS_DOCUMENTS_STORAGE_KEY = "commuaria_terms_documents";
const LOCAL_TERMS_ACCEPTANCES_KEY = "commuaria_terms_acceptances";
const MAX_TERMS_TITLE_LENGTH = 180;
const MAX_TERMS_CONTENT_LENGTH = 50000;

export const INITIAL_DEMO_TERMS: Omit<TermsDocument, "published_at"> = {
  version: 1,
  title: "Termos de Uso — versão demonstrativa",
  content:
    "Esta é uma versão demonstrativa dos Termos de Uso, preparada para o trabalho escolar da Commuária. Não é um documento jurídico operacional, não representa contratação municipal nem prestação real de serviço. O conteúdo deve ser revisado pelo ADM para a apresentação e validado antes de qualquer uso real.\n\n" +
    "1. Use o protótipo somente com dados fictícios. Não informe dados pessoais, senhas, endereços precisos ou imagens de pessoas reais.\n" +
    "2. Ocorrências, contas e resultados exibidos na demonstração são exemplos e não constituem solicitações oficiais de serviços municipais.\n" +
    "3. O protótipo não substitui canais oficiais de emergência, atendimento urgente ou serviços públicos.\n" +
    "4. A política de privacidade e as configurações técnicas também devem ser consultadas. O aceite destes Termos não substitui consentimentos específicos eventualmente necessários.\n" +
    "5. Quando uma nova versão for publicada, usuários que não sejam ADM deverão lê-la e aceitá-la para continuar usando a aplicação. O aceite será registrado com a versão e a data.",
  is_current: true,
};

function normalizeTermsDocument(value: any): TermsDocument | null {
  if (
    !value ||
    !Number.isInteger(Number(value.version)) ||
    Number(value.version) < 1 ||
    typeof value.title !== "string" ||
    typeof value.content !== "string"
  ) {
    return null;
  }

  return {
    version: Number(value.version),
    title: value.title,
    content: value.content,
    published_at:
      typeof value.published_at === "string" ? value.published_at : new Date(0).toISOString(),
    is_current: value.is_current !== false,
  };
}

function getLocalStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function readLocalDocuments(): TermsDocument[] {
  const storage = getLocalStorage();
  if (!storage) throw new Error("O armazenamento local não está disponível neste navegador.");

  let documents: TermsDocument[] = [];
  try {
    const raw = storage.getItem(TERMS_DOCUMENTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      documents = parsed
        .map(normalizeTermsDocument)
        .filter((document): document is TermsDocument => document !== null);
    }
  } catch {
    documents = [];
  }

  if (documents.length === 0) {
    documents = [
      {
        ...INITIAL_DEMO_TERMS,
        published_at: new Date().toISOString(),
      },
    ];
    storage.setItem(TERMS_DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
  }

  return documents.sort((a, b) => b.version - a.version);
}

async function getAuthenticatedUserId(client: any): Promise<string> {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const userId = data?.session?.user?.id;
  if (typeof userId !== "string" || !userId.trim()) {
    throw new Error("A sessão da conta não está ativa. Entre novamente para continuar.");
  }
  return userId;
}

export async function fetchCurrentTerms(
  client: any,
  isRealSupabase: boolean,
): Promise<TermsDocument | null> {
  if (!client) throw new Error("O serviço de Termos de Uso não está disponível.");

  if (!isRealSupabase) {
    return readLocalDocuments()[0] || null;
  }

  const { data, error } = await client
    .from("terms_documents")
    .select("version,title,content,published_at,is_current")
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  return normalizeTermsDocument(data);
}

export async function hasAcceptedTerms(
  client: any,
  isRealSupabase: boolean,
  localUserId: string,
  version: number,
): Promise<boolean> {
  if (!client) throw new Error("O serviço de Termos de Uso não está disponível.");

  if (!isRealSupabase) {
    const storage = getLocalStorage();
    if (!storage) throw new Error("O armazenamento local não está disponível neste navegador.");
    try {
      const raw = storage.getItem(LOCAL_TERMS_ACCEPTANCES_KEY);
      const acceptances = raw ? JSON.parse(raw) : [];
      return Array.isArray(acceptances) && acceptances.some(
        (entry: any) => entry?.user_id === localUserId && Number(entry?.terms_version) === version,
      );
    } catch {
      return false;
    }
  }

  const authUserId = await getAuthenticatedUserId(client);
  const { data, error } = await client
    .from("terms_acceptances")
    .select("terms_version")
    .eq("user_id", authUserId)
    .eq("terms_version", version)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function acceptCurrentTerms(
  client: any,
  isRealSupabase: boolean,
  localUserId: string,
  version: number,
): Promise<void> {
  if (!client) throw new Error("O serviço de Termos de Uso não está disponível.");

  if (!isRealSupabase) {
    const storage = getLocalStorage();
    if (!storage) throw new Error("O armazenamento local não está disponível neste navegador.");
    const currentDocument = readLocalDocuments()[0];
    if (!currentDocument || currentDocument.version !== version) {
      throw new Error("Esta versão dos Termos não está mais vigente. Atualize e tente novamente.");
    }
    let acceptances: any[] = [];
    try {
      const raw = storage.getItem(LOCAL_TERMS_ACCEPTANCES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) acceptances = parsed;
    } catch {
      acceptances = [];
    }

    if (!acceptances.some(
      (entry) => entry?.user_id === localUserId && Number(entry?.terms_version) === version,
    )) {
      acceptances.push({
        user_id: localUserId,
        terms_version: version,
        accepted_at: new Date().toISOString(),
      });
      storage.setItem(LOCAL_TERMS_ACCEPTANCES_KEY, JSON.stringify(acceptances));
    }
    return;
  }

  await getAuthenticatedUserId(client);
  const { error } = await client.rpc("accept_current_terms", {
    p_terms_version: version,
  });
  if (error) throw error;
}

export async function publishTerms(
  client: any,
  isRealSupabase: boolean,
  title: string,
  content: string,
): Promise<TermsDocument> {
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();
  if (!normalizedTitle || normalizedTitle.length > MAX_TERMS_TITLE_LENGTH) {
    throw new Error(`O título deve ter entre 1 e ${MAX_TERMS_TITLE_LENGTH} caracteres.`);
  }
  if (!normalizedContent || normalizedContent.length > MAX_TERMS_CONTENT_LENGTH) {
    throw new Error(`O texto deve ter entre 1 e ${MAX_TERMS_CONTENT_LENGTH} caracteres.`);
  }
  if (!client) throw new Error("O serviço de Termos de Uso não está disponível.");

  if (!isRealSupabase) {
    const storage = getLocalStorage();
    if (!storage) throw new Error("O armazenamento local não está disponível neste navegador.");
    const existingDocuments = readLocalDocuments();
    const nextVersion = Math.max(...existingDocuments.map((document) => document.version)) + 1;
    const published: TermsDocument = {
      version: nextVersion,
      title: normalizedTitle,
      content: normalizedContent,
      published_at: new Date().toISOString(),
      is_current: true,
    };
    storage.setItem(
      TERMS_DOCUMENTS_STORAGE_KEY,
      JSON.stringify([
        published,
        ...existingDocuments.map((document) => ({ ...document, is_current: false })),
      ]),
    );
    return published;
  }

  const { data, error } = await client.rpc("publish_terms", {
    p_title: normalizedTitle,
    p_content: normalizedContent,
  });
  if (error) throw error;
  const published = normalizeTermsDocument(Array.isArray(data) ? data[0] : data);
  if (!published) throw new Error("O servidor não retornou a nova versão dos Termos.");
  return published;
}
