import { readFileSync } from 'fs';
import { basename } from 'path';

const DEFAULT_BASE_URL = 'https://api.mercury.com/api/v1';

export class MercuryClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl?: string) {
    this.token = token;
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      params?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, params } = options;
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 204) return {} as T;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error ${response.status}: ${text}`);
    }

    return response.json();
  }

  private async uploadFile<T>(endpoint: string, filePath: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const form = new FormData();
    const data = readFileSync(filePath);
    form.append('file', new Blob([data]), basename(filePath));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
      body: form,
    });

    if (response.status === 204) return {} as T;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error ${response.status}: ${text}`);
    }

    return response.json();
  }

  // --- Accounts ---

  async listAccounts(params?: { page?: string }) {
    return this.request<any>('/accounts', { params });
  }

  async getAccount(accountId: string) {
    return this.request<any>(`/account/${encodeURIComponent(accountId)}`);
  }

  async getAccountCards(accountId: string) {
    return this.request<any>(`/account/${encodeURIComponent(accountId)}/cards`);
  }

  async getAccountStatements(accountId: string) {
    return this.request<any>(`/account/${encodeURIComponent(accountId)}/statements`);
  }

  async createInternalTransfer(data: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    idempotencyKey?: string;
    note?: string;
  }) {
    return this.request<any>('/transfer', {
      method: 'POST',
      body: data,
    });
  }

  // --- Transactions ---

  async listAccountTransactions(accountId: string, params?: {
    limit?: number;
    offset?: string;
    status?: string;
    start?: string;
    end?: string;
    search?: string;
    page?: string;
  }) {
    return this.request<any>(`/account/${encodeURIComponent(accountId)}/transactions`, { params });
  }

  async listAllTransactions(params?: {
    limit?: number;
    offset?: string;
    status?: string;
    start?: string;
    end?: string;
    search?: string;
    page?: string;
  }) {
    return this.request<any>('/transactions', { params });
  }

  async getTransaction(transactionId: string) {
    return this.request<any>(`/transaction/${encodeURIComponent(transactionId)}`);
  }

  async updateTransaction(transactionId: string, data: {
    note?: string | null;
    categoryId?: string | null;
  }) {
    return this.request<any>(`/transaction/${encodeURIComponent(transactionId)}`, {
      method: 'PATCH',
      body: data,
    });
  }

  async uploadTransactionAttachment(transactionId: string, filePath: string) {
    return this.uploadFile<any>(`/transaction/${encodeURIComponent(transactionId)}/attachments`, filePath);
  }

  async sendMoney(accountId: string, data: {
    recipientId: string;
    amount: number;
    paymentMethod: string;
    idempotencyKey: string;
    memo?: string;
    note?: string;
  }) {
    return this.request<any>(`/account/${encodeURIComponent(accountId)}/transactions`, {
      method: 'POST',
      body: data,
    });
  }

  // --- Request Send Money (queued for approval) ---

  async requestSendMoney(accountId: string, data: {
    recipientId: string;
    amount: number;
    paymentMethod: string;
    idempotencyKey: string;
    memo?: string;
    note?: string;
  }) {
    return this.request<any>(`/account/${encodeURIComponent(accountId)}/request-send-money`, {
      method: 'POST',
      body: data,
    });
  }

  async listSendMoneyApprovalRequests(params?: { page?: string }) {
    return this.request<any>('/request-send-money', { params });
  }

  async getSendMoneyApprovalRequest(requestId: string) {
    return this.request<any>(`/request-send-money/${encodeURIComponent(requestId)}`);
  }

  // --- Cards ---

  async listCards() {
    return this.request<any>('/cards');
  }

  async createCard(data: {
    userId: string;
    type: string;
    kind: string;
    accountId?: string;
    nickname?: string;
    spendLimit?: any;
    cardSpendManagementState?: any;
  }) {
    return this.request<any>('/cards', { method: 'POST', body: data });
  }

  async getCard(cardId: string) {
    return this.request<any>(`/cards/${encodeURIComponent(cardId)}`);
  }

  async updateCard(cardId: string, data: { nickname?: string; spendLimit?: any }) {
    return this.request<any>(`/cards/${encodeURIComponent(cardId)}`, {
      method: 'POST',
      body: data,
    });
  }

  async cancelCard(cardId: string) {
    return this.request<any>(`/cards/${encodeURIComponent(cardId)}/cancel`, { method: 'POST' });
  }

  async freezeCard(cardId: string) {
    return this.request<any>(`/cards/${encodeURIComponent(cardId)}/freeze`, { method: 'POST' });
  }

  async unfreezeCard(cardId: string) {
    return this.request<any>(`/cards/${encodeURIComponent(cardId)}/unfreeze`, { method: 'POST' });
  }

  // --- Recipients ---

  async listRecipients(params?: { page?: string }) {
    return this.request<any>('/recipients', { params });
  }

  async getRecipient(recipientId: string) {
    return this.request<any>(`/recipient/${encodeURIComponent(recipientId)}`);
  }

  async createRecipient(data: {
    name: string;
    emails: string[];
    nickname?: string;
    contactEmail?: string;
    electronicRoutingInfo?: any;
    domesticWireRoutingInfo?: any;
    checkInfo?: any;
  }) {
    return this.request<any>('/recipients', { method: 'POST', body: data });
  }

  async updateRecipient(recipientId: string, data: {
    name?: string;
    emails?: string[];
    nickname?: string;
    contactEmail?: string;
    electronicRoutingInfo?: any;
    domesticWireRoutingInfo?: any;
    checkInfo?: any;
  }) {
    return this.request<any>(`/recipient/${encodeURIComponent(recipientId)}`, {
      method: 'POST',
      body: data,
    });
  }

  async deleteRecipient(recipientId: string) {
    return this.request<any>(`/recipient/${encodeURIComponent(recipientId)}`, { method: 'DELETE' });
  }

  async listRecipientAttachments() {
    return this.request<any>('/recipients/attachments');
  }

  async uploadRecipientAttachment(recipientId: string, filePath: string) {
    return this.uploadFile<any>(`/recipient/${encodeURIComponent(recipientId)}/attachments`, filePath);
  }

  // --- Recipient Invites ---

  async listRecipientInvites(params?: { page?: string }) {
    return this.request<any>('/recipients/invites', { params });
  }

  async createRecipientInvite(data: {
    name: string;
    contactEmail?: string;
    notes?: string;
    organizationNameOnRequest?: string;
    paymentMethods?: string[];
    recipientId?: string;
    requireTaxDocument?: boolean;
    sendEmail?: boolean;
  }) {
    return this.request<any>('/recipients/invites', { method: 'POST', body: data });
  }

  async getRecipientInvite(inviteId: string) {
    return this.request<any>(`/recipients/invites/${encodeURIComponent(inviteId)}`);
  }

  async deleteRecipientInvite(inviteId: string) {
    return this.request<any>(`/recipients/invites/${encodeURIComponent(inviteId)}`, { method: 'DELETE' });
  }

  // --- Accounts Receivable (Invoices) ---

  async listArInvoices(params?: { page?: string; status?: string }) {
    return this.request<any>('/ar/invoices', { params });
  }

  async getArInvoice(slug: string) {
    return this.request<any>(`/ar/invoices/${encodeURIComponent(slug)}`);
  }

  async createArInvoice(data: {
    customerId: string;
    lineItems: any[];
    dueDate?: string;
    memo?: string;
    invoiceNumber?: string;
  }) {
    return this.request<any>('/ar/invoices', { method: 'POST', body: data });
  }

  async updateArInvoice(slug: string, data: any) {
    return this.request<any>(`/ar/invoices/${encodeURIComponent(slug)}`, {
      method: 'POST',
      body: data,
    });
  }

  async cancelArInvoice(slug: string) {
    return this.request<any>(`/ar/invoices/${encodeURIComponent(slug)}/cancel`, {
      method: 'POST',
    });
  }

  async getArInvoicePdf(slug: string) {
    return this.request<any>(`/ar/invoices/${encodeURIComponent(slug)}/pdf`);
  }

  async listArInvoiceAttachments(slug: string) {
    return this.request<any>(`/ar/invoices/${encodeURIComponent(slug)}/attachments`);
  }

  async getArAttachment(attachmentId: string) {
    return this.request<any>(`/ar/attachments/${encodeURIComponent(attachmentId)}`);
  }

  // --- AR Customers ---

  async listArCustomers(params?: { page?: string }) {
    return this.request<any>('/ar/customers', { params });
  }

  async getArCustomer(customerId: string) {
    return this.request<any>(`/ar/customers/${encodeURIComponent(customerId)}`);
  }

  async createArCustomer(data: {
    name: string;
    email?: string;
    address?: any;
  }) {
    return this.request<any>('/ar/customers', { method: 'POST', body: data });
  }

  async updateArCustomer(customerId: string, data: any) {
    return this.request<any>(`/ar/customers/${encodeURIComponent(customerId)}`, {
      method: 'POST',
      body: data,
    });
  }

  async deleteArCustomer(customerId: string) {
    return this.request<any>(`/ar/customers/${encodeURIComponent(customerId)}`, { method: 'DELETE' });
  }

  // --- Treasury ---

  async listTreasuryAccounts() {
    return this.request<any>('/treasury');
  }

  async listTreasuryTransactions(treasuryId: string, params?: { page?: string }) {
    return this.request<any>(`/treasury/${encodeURIComponent(treasuryId)}/transactions`, { params });
  }

  async listTreasuryStatements(treasuryId: string) {
    return this.request<any>(`/treasury/${encodeURIComponent(treasuryId)}/statements`);
  }

  // --- Categories ---

  async listCategories() {
    return this.request<any>('/categories');
  }

  async createCategory(data: {
    name: string;
    visibleForCardSpend: boolean;
    visibleForOther: boolean;
    visibleForReimbursements: boolean;
  }) {
    return this.request<any>('/categories', { method: 'POST', body: data });
  }

  async editCategory(categoryId: string, data: {
    name?: string;
    visibleForCardSpend?: boolean;
    visibleForOther?: boolean;
    visibleForReimbursements?: boolean;
  }) {
    return this.request<any>(`/categories/${encodeURIComponent(categoryId)}`, {
      method: 'POST',
      body: data,
    });
  }

  async deleteCategory(categoryId: string) {
    return this.request<any>(`/categories/${encodeURIComponent(categoryId)}`, { method: 'DELETE' });
  }

  // --- Credit ---

  async listCreditAccounts() {
    return this.request<any>('/credit');
  }

  // --- Organization ---

  async getOrganization() {
    return this.request<any>('/organization');
  }

  // --- Users ---

  async listUsers(params?: { page?: string }) {
    return this.request<any>('/users', { params });
  }

  async getUser(userId: string) {
    return this.request<any>(`/users/${encodeURIComponent(userId)}`);
  }

  // --- Events ---

  async listEvents(params?: { page?: string }) {
    return this.request<any>('/events', { params });
  }

  async getEvent(eventId: string) {
    return this.request<any>(`/events/${encodeURIComponent(eventId)}`);
  }

  // --- Webhooks ---

  async listWebhooks(params?: { page?: string }) {
    return this.request<any>('/webhooks', { params });
  }

  async getWebhook(webhookId: string) {
    return this.request<any>(`/webhooks/${encodeURIComponent(webhookId)}`);
  }

  async createWebhook(data: { url: string; eventTypes?: string[]; filterPaths?: string[] }) {
    return this.request<any>('/webhooks', { method: 'POST', body: data });
  }

  async updateWebhook(webhookId: string, data: {
    url?: string;
    eventTypes?: string[];
    filterPaths?: string[];
    status?: string;
  }) {
    return this.request<any>(`/webhooks/${encodeURIComponent(webhookId)}`, {
      method: 'POST',
      body: data,
    });
  }

  async deleteWebhook(webhookId: string) {
    return this.request<any>(`/webhooks/${encodeURIComponent(webhookId)}`, { method: 'DELETE' });
  }

  async verifyWebhook(webhookId: string, eventType: string) {
    return this.request<any>(`/webhooks/${encodeURIComponent(webhookId)}/verify`, {
      method: 'POST',
      body: { eventType },
    });
  }

  // --- SAFEs ---

  async listSafes(params?: { page?: string }) {
    return this.request<any>('/safes', { params });
  }

  async getSafe(safeId: string) {
    return this.request<any>(`/safes/${encodeURIComponent(safeId)}`);
  }

  async getSafeDocument(safeId: string) {
    return this.request<any>(`/safes/${encodeURIComponent(safeId)}/document`);
  }

  // --- Statements ---

  async getStatementPdf(statementId: string) {
    return this.request<any>(`/statements/${encodeURIComponent(statementId)}/pdf`);
  }

  // --- Onboarding ---

  async submitOnboardingData(data: any) {
    return this.request<any>('/submit-onboarding-data', { method: 'POST', body: data });
  }

  // --- Books: Chart of Accounts Templates ---

  async listCoaTemplates() {
    return this.request<any>('/books/agent-coa-templates');
  }

  async createCoaTemplate(data: any) {
    return this.request<any>('/books/agent-coa-templates', { method: 'POST', body: data });
  }

  async getCoaTemplate(coaTemplateId: string) {
    return this.request<any>(`/books/agent-coa-template/${encodeURIComponent(coaTemplateId)}`);
  }

  async deleteCoaTemplate(coaTemplateId: string) {
    return this.request<any>(`/books/agent-coa-template/${encodeURIComponent(coaTemplateId)}`, { method: 'DELETE' });
  }

  // --- Books: Ledger Templates ---

  async createLedgerTemplate(data: any) {
    return this.request<any>('/books/agent-ledger-templates', { method: 'POST', body: data });
  }

  async updateLedgerTemplate(ledgerId: string, data: any) {
    return this.request<any>(`/books/agent-ledger-template/${encodeURIComponent(ledgerId)}`, { method: 'PUT', body: data });
  }

  async deleteLedgerTemplate(ledgerId: string) {
    return this.request<any>(`/books/agent-ledger-template/${encodeURIComponent(ledgerId)}`, { method: 'DELETE' });
  }

  // --- Books: Journal Entries ---

  async listJournalEntries(booksId: string) {
    return this.request<any>(`/books/journal-entries/${encodeURIComponent(booksId)}`);
  }

  async createJournalEntries(booksId: string, data: any) {
    return this.request<any>(`/books/journal-entries/${encodeURIComponent(booksId)}`, { method: 'POST', body: data });
  }

  async updateJournalEntries(booksId: string, data: any) {
    return this.request<any>(`/books/journal-entries/${encodeURIComponent(booksId)}`, { method: 'PUT', body: data });
  }

  async deleteJournalEntries(booksId: string, data?: any) {
    return this.request<any>(`/books/journal-entries/${encodeURIComponent(booksId)}`, { method: 'DELETE', body: data });
  }

  async getJournalEntry(booksId: string, journalEntryId: string) {
    return this.request<any>(`/books/journal-entry/${encodeURIComponent(booksId)}/${encodeURIComponent(journalEntryId)}`);
  }
}
