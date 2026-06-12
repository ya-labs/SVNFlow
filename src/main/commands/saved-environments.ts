export type SavedEnvironmentValidationStatus = 'ready' | 'blocked' | 'error' | 'pending';

export interface SavedEnvironment {
  id: string;
  name: string;
  gitWorkspacePath: string;
  svnCheckoutPath: string;
  svnUrl?: string;
  svnCheckoutRoot?: string;
  svnRevision?: string;
  lastValidatedAt?: string;
  lastValidationStatus?: Exclude<SavedEnvironmentValidationStatus, 'pending'>;
}

export interface SavedEnvironmentListItem extends Omit<SavedEnvironment, 'lastValidationStatus'> {
  lastValidationStatus: SavedEnvironmentValidationStatus;
  needsRevalidation: boolean;
  safeForSensitiveOperations: boolean;
}

export interface ListSavedEnvironmentsInput {
  environments: SavedEnvironment[];
  now?: string;
  revalidationMaxAgeMinutes?: number;
}

export interface ListSavedEnvironmentsResult {
  items: SavedEnvironmentListItem[];
  message: string;
}

export interface SelectSavedEnvironmentInput {
  environments: SavedEnvironment[];
  environmentId: string;
  now?: string;
  revalidationMaxAgeMinutes?: number;
}

export interface SelectedEnvironment {
  id: string;
  name: string;
  gitWorkspacePath: string;
  svnCheckoutPath: string;
}

export interface SelectSavedEnvironmentResult {
  selectedEnvironment?: SelectedEnvironment;
  lastValidationStatus?: SavedEnvironmentValidationStatus;
  needsRevalidation: boolean;
  safeForSensitiveOperations: boolean;
  message: string;
}

function parseTimestamp(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function calculateNeedsRevalidation(
  lastValidatedAt: string | undefined,
  now: string,
  revalidationMaxAgeMinutes: number
): boolean {
  const lastValidatedTimestamp = parseTimestamp(lastValidatedAt);
  const nowTimestamp = parseTimestamp(now);

  if (lastValidatedTimestamp === undefined || nowTimestamp === undefined) {
    return true;
  }

  const maxAgeInMs = revalidationMaxAgeMinutes * 60 * 1000;
  return nowTimestamp - lastValidatedTimestamp > maxAgeInMs;
}

function buildListItem(
  environment: SavedEnvironment,
  now: string,
  revalidationMaxAgeMinutes: number
): SavedEnvironmentListItem {
  const hasKnownStatus = Boolean(environment.lastValidationStatus);
  const needsRevalidation = calculateNeedsRevalidation(
    environment.lastValidatedAt,
    now,
    revalidationMaxAgeMinutes
  );

  return {
    ...environment,
    lastValidationStatus: hasKnownStatus ? environment.lastValidationStatus! : 'pending',
    needsRevalidation,
    // A listagem nunca deve apresentar ambiente como seguro sem validação atual.
    safeForSensitiveOperations: false
  };
}

export function listSavedEnvironments(input: ListSavedEnvironmentsInput): ListSavedEnvironmentsResult {
  const now = input.now ?? new Date().toISOString();
  const revalidationMaxAgeMinutes = input.revalidationMaxAgeMinutes ?? 60;

  const items = input.environments
    .map((environment) => buildListItem(environment, now, revalidationMaxAgeMinutes))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  if (items.length === 0) {
    return {
      items,
      message: 'Nenhum ambiente salvo encontrado.'
    };
  }

  const pendingCount = items.filter((item) => item.needsRevalidation).length;

  return {
    items,
    message: pendingCount > 0
      ? `${items.length} ambiente(s) carregado(s), ${pendingCount} pendente(s) de revalidação.`
      : `${items.length} ambiente(s) carregado(s).`
  };
}

export function selectSavedEnvironment(input: SelectSavedEnvironmentInput): SelectSavedEnvironmentResult {
  const listResult = listSavedEnvironments({
    environments: input.environments,
    now: input.now,
    revalidationMaxAgeMinutes: input.revalidationMaxAgeMinutes
  });

  const selected = listResult.items.find((item) => item.id === input.environmentId);

  if (!selected) {
    return {
      needsRevalidation: true,
      safeForSensitiveOperations: false,
      message: 'Ambiente salvo não encontrado.'
    };
  }

  return {
    selectedEnvironment: {
      id: selected.id,
      name: selected.name,
      gitWorkspacePath: selected.gitWorkspacePath,
      svnCheckoutPath: selected.svnCheckoutPath
    },
    lastValidationStatus: selected.lastValidationStatus,
    needsRevalidation: true,
    safeForSensitiveOperations: false,
    message: `Ambiente ${selected.name} selecionado. Revalide antes de continuar.`
  };
}