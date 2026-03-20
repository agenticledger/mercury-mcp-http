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

  async createInternalTransfer(accountId: string, data: {
    receivingAccountId: string;
    amount: number;
    memo?: string;
    idempotencyKey?: string;
  }) {
    return this.request<any>(`/account/${encodeURIComponent(accountId)}/internal-transfer`, {
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
    return this.request<any>('/recipient', { method: 'POST', body: data });
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

  async listRecipientAttachments(recipientId: string) {
    return this.request<any>(`/recipient/${encodeURIComponent(recipientId)}/attachments`);
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

  // --- Treasury ---

  async listTreasuryAccounts() {
    return this.request<any>('/treasury');
  }

  async listTreasuryTransactions(params?: { page?: string }) {
    return this.request<any>('/treasury/transactions', { params });
  }

  // --- Categories ---

  async listCategories() {
    return this.request<any>('/categories');
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
    return this.request<any>(`/user/${encodeURIComponent(userId)}`);
  }

  // --- Events ---

  async listEvents(params?: { page?: string }) {
    return this.request<any>('/events', { params });
  }

  async getEvent(eventId: string) {
    return this.request<any>(`/event/${encodeURIComponent(eventId)}`);
  }

  // --- Webhooks ---

  async listWebhooks(params?: { page?: string }) {
    return this.request<any>('/webhooks', { params });
  }

  async getWebhook(webhookId: string) {
    return this.request<any>(`/webhook/${encodeURIComponent(webhookId)}`);
  }

  async createWebhook(data: { url: string; events?: string[] }) {
    return this.request<any>('/webhook', { method: 'POST', body: data });
  }

  async updateWebhook(webhookId: string, data: { url?: string; events?: string[] }) {
    return this.request<any>(`/webhook/${encodeURIComponent(webhookId)}`, {
      method: 'POST',
      body: data,
    });
  }

  // --- SAFEs ---

  async listSafes(params?: { page?: string }) {
    return this.request<any>('/safe-requests', { params });
  }

  async getSafe(safeId: string) {
    return this.request<any>(`/safe-request/${encodeURIComponent(safeId)}`);
  }

  // --- Statements ---

  async getStatementPdf(statementId: string) {
    return this.request<any>(`/statement/${encodeURIComponent(statementId)}/pdf`);
  }

  // --- Send Money Approval ---

  async getSendMoneyApprovalRequest(requestId: string) {
    return this.request<any>(`/send-money-approval-request/${encodeURIComponent(requestId)}`);
  }
}
