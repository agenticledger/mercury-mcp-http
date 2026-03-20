import { z } from 'zod';
import { MercuryClient } from './api-client.js';

interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (client: MercuryClient, args: any) => Promise<any>;
}

export const tools: ToolDef[] = [
  // --- Accounts ---
  {
    name: 'accounts_list',
    description: 'List all bank accounts',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listAccounts({ page: args.page }),
  },
  {
    name: 'account_get',
    description: 'Get account details by ID',
    inputSchema: z.object({
      account_id: z.string().describe('account UUID'),
    }),
    handler: async (client, args: { account_id: string }) =>
      client.getAccount(args.account_id),
  },
  {
    name: 'account_cards',
    description: 'List cards for an account',
    inputSchema: z.object({
      account_id: z.string().describe('account UUID'),
    }),
    handler: async (client, args: { account_id: string }) =>
      client.getAccountCards(args.account_id),
  },
  {
    name: 'account_statements',
    description: 'List statements for an account',
    inputSchema: z.object({
      account_id: z.string().describe('account UUID'),
    }),
    handler: async (client, args: { account_id: string }) =>
      client.getAccountStatements(args.account_id),
  },
  {
    name: 'internal_transfer',
    description: 'Transfer between Mercury accounts',
    inputSchema: z.object({
      account_id: z.string().describe('source account UUID'),
      receiving_account_id: z.string().describe('destination account UUID'),
      amount: z.number().describe('transfer amount in dollars'),
      memo: z.string().optional().describe('transfer memo'),
      idempotency_key: z.string().optional().describe('idempotency key'),
    }),
    handler: async (client, args: {
      account_id: string; receiving_account_id: string;
      amount: number; memo?: string; idempotency_key?: string;
    }) => client.createInternalTransfer(args.account_id, {
      receivingAccountId: args.receiving_account_id,
      amount: args.amount,
      memo: args.memo,
      idempotencyKey: args.idempotency_key,
    }),
  },

  // --- Transactions ---
  {
    name: 'account_transactions_list',
    description: 'List transactions for an account',
    inputSchema: z.object({
      account_id: z.string().describe('account UUID'),
      limit: z.number().optional().describe('max results'),
      offset: z.string().optional().describe('pagination offset'),
      status: z.string().optional().describe('pending, sent, cancelled'),
      start: z.string().optional().describe('start date (ISO)'),
      end: z.string().optional().describe('end date (ISO)'),
      search: z.string().optional().describe('search query'),
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: {
      account_id: string; limit?: number; offset?: string;
      status?: string; start?: string; end?: string;
      search?: string; page?: string;
    }) => {
      const { account_id, ...params } = args;
      return client.listAccountTransactions(account_id, params);
    },
  },
  {
    name: 'transactions_list',
    description: 'List all transactions across accounts',
    inputSchema: z.object({
      limit: z.number().optional().describe('max results'),
      offset: z.string().optional().describe('pagination offset'),
      status: z.string().optional().describe('pending, sent, cancelled'),
      start: z.string().optional().describe('start date (ISO)'),
      end: z.string().optional().describe('end date (ISO)'),
      search: z.string().optional().describe('search query'),
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: {
      limit?: number; offset?: string; status?: string;
      start?: string; end?: string; search?: string; page?: string;
    }) => client.listAllTransactions(args),
  },
  {
    name: 'transaction_get',
    description: 'Get transaction details by ID',
    inputSchema: z.object({
      transaction_id: z.string().describe('transaction UUID'),
    }),
    handler: async (client, args: { transaction_id: string }) =>
      client.getTransaction(args.transaction_id),
  },
  {
    name: 'transaction_update',
    description: 'Update transaction note or category',
    inputSchema: z.object({
      transaction_id: z.string().describe('transaction UUID'),
      note: z.string().optional().describe('transaction note'),
      category_id: z.string().optional().describe('category UUID'),
    }),
    handler: async (client, args: {
      transaction_id: string; note?: string; category_id?: string;
    }) => client.updateTransaction(args.transaction_id, {
      note: args.note,
      categoryId: args.category_id,
    }),
  },
  {
    name: 'send_money',
    description: 'Send payment to a recipient',
    inputSchema: z.object({
      account_id: z.string().describe('source account UUID'),
      recipient_id: z.string().describe('recipient UUID'),
      amount: z.number().describe('amount in dollars'),
      payment_method: z.enum(['ach', 'domesticWire', 'check']).describe('payment method'),
      idempotency_key: z.string().describe('unique request key'),
      memo: z.string().optional().describe('payment memo'),
      note: z.string().optional().describe('internal note'),
    }),
    handler: async (client, args: {
      account_id: string; recipient_id: string; amount: number;
      payment_method: string; idempotency_key: string;
      memo?: string; note?: string;
    }) => client.sendMoney(args.account_id, {
      recipientId: args.recipient_id,
      amount: args.amount,
      paymentMethod: args.payment_method,
      idempotencyKey: args.idempotency_key,
      memo: args.memo,
      note: args.note,
    }),
  },

  // --- Recipients ---
  {
    name: 'recipients_list',
    description: 'List all payment recipients',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listRecipients({ page: args.page }),
  },
  {
    name: 'recipient_get',
    description: 'Get recipient details by ID',
    inputSchema: z.object({
      recipient_id: z.string().describe('recipient UUID'),
    }),
    handler: async (client, args: { recipient_id: string }) =>
      client.getRecipient(args.recipient_id),
  },
  {
    name: 'recipient_create',
    description: 'Add a new payment recipient',
    inputSchema: z.object({
      name: z.string().describe('recipient name'),
      emails: z.string().describe('comma-separated emails'),
      nickname: z.string().optional().describe('display nickname'),
      contact_email: z.string().optional().describe('contact email'),
      routing_data: z.string().optional().describe('routing info JSON'),
    }),
    handler: async (client, args: {
      name: string; emails: string; nickname?: string;
      contact_email?: string; routing_data?: string;
    }) => {
      const body: any = {
        name: args.name,
        emails: args.emails.split(',').map(e => e.trim()),
      };
      if (args.nickname) body.nickname = args.nickname;
      if (args.contact_email) body.contactEmail = args.contact_email;
      if (args.routing_data) {
        const routing = JSON.parse(args.routing_data);
        if (routing.electronicRoutingInfo) body.electronicRoutingInfo = routing.electronicRoutingInfo;
        if (routing.domesticWireRoutingInfo) body.domesticWireRoutingInfo = routing.domesticWireRoutingInfo;
        if (routing.checkInfo) body.checkInfo = routing.checkInfo;
      }
      return client.createRecipient(body);
    },
  },
  {
    name: 'recipient_update',
    description: 'Edit recipient information',
    inputSchema: z.object({
      recipient_id: z.string().describe('recipient UUID'),
      data: z.string().describe('update JSON'),
    }),
    handler: async (client, args: { recipient_id: string; data: string }) =>
      client.updateRecipient(args.recipient_id, JSON.parse(args.data)),
  },
  {
    name: 'recipient_attachments',
    description: 'List recipient attachments',
    inputSchema: z.object({
      recipient_id: z.string().describe('recipient UUID'),
    }),
    handler: async (client, args: { recipient_id: string }) =>
      client.listRecipientAttachments(args.recipient_id),
  },

  // --- AR Invoices ---
  {
    name: 'ar_invoices_list',
    description: 'List accounts receivable invoices',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
      status: z.string().optional().describe('draft, sent, paid, etc'),
    }),
    handler: async (client, args: { page?: string; status?: string }) =>
      client.listArInvoices(args),
  },
  {
    name: 'ar_invoice_get',
    description: 'Get AR invoice by slug',
    inputSchema: z.object({
      slug: z.string().describe('invoice slug'),
    }),
    handler: async (client, args: { slug: string }) =>
      client.getArInvoice(args.slug),
  },
  {
    name: 'ar_invoice_create',
    description: 'Create an AR invoice',
    inputSchema: z.object({
      customer_id: z.string().describe('AR customer ID'),
      line_items: z.string().describe('line items JSON array'),
      due_date: z.string().optional().describe('due date (ISO)'),
      memo: z.string().optional().describe('invoice memo'),
      invoice_number: z.string().optional().describe('custom invoice #'),
    }),
    handler: async (client, args: {
      customer_id: string; line_items: string;
      due_date?: string; memo?: string; invoice_number?: string;
    }) => client.createArInvoice({
      customerId: args.customer_id,
      lineItems: JSON.parse(args.line_items),
      dueDate: args.due_date,
      memo: args.memo,
      invoiceNumber: args.invoice_number,
    }),
  },
  {
    name: 'ar_invoice_update',
    description: 'Update an AR invoice',
    inputSchema: z.object({
      slug: z.string().describe('invoice slug'),
      data: z.string().describe('update JSON'),
    }),
    handler: async (client, args: { slug: string; data: string }) =>
      client.updateArInvoice(args.slug, JSON.parse(args.data)),
  },
  {
    name: 'ar_invoice_cancel',
    description: 'Cancel an AR invoice',
    inputSchema: z.object({
      slug: z.string().describe('invoice slug'),
    }),
    handler: async (client, args: { slug: string }) =>
      client.cancelArInvoice(args.slug),
  },
  {
    name: 'ar_invoice_pdf',
    description: 'Get AR invoice PDF download URL',
    inputSchema: z.object({
      slug: z.string().describe('invoice slug'),
    }),
    handler: async (client, args: { slug: string }) =>
      client.getArInvoicePdf(args.slug),
  },
  {
    name: 'ar_invoice_attachments',
    description: 'List AR invoice attachments',
    inputSchema: z.object({
      slug: z.string().describe('invoice slug'),
    }),
    handler: async (client, args: { slug: string }) =>
      client.listArInvoiceAttachments(args.slug),
  },

  // --- AR Customers ---
  {
    name: 'ar_customers_list',
    description: 'List AR customers',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listArCustomers({ page: args.page }),
  },
  {
    name: 'ar_customer_get',
    description: 'Get AR customer details',
    inputSchema: z.object({
      customer_id: z.string().describe('customer ID'),
    }),
    handler: async (client, args: { customer_id: string }) =>
      client.getArCustomer(args.customer_id),
  },
  {
    name: 'ar_customer_create',
    description: 'Create an AR customer',
    inputSchema: z.object({
      name: z.string().describe('customer name'),
      email: z.string().optional().describe('customer email'),
      address: z.string().optional().describe('address JSON'),
    }),
    handler: async (client, args: { name: string; email?: string; address?: string }) =>
      client.createArCustomer({
        name: args.name,
        email: args.email,
        address: args.address ? JSON.parse(args.address) : undefined,
      }),
  },
  {
    name: 'ar_customer_update',
    description: 'Update an AR customer',
    inputSchema: z.object({
      customer_id: z.string().describe('customer ID'),
      data: z.string().describe('update JSON'),
    }),
    handler: async (client, args: { customer_id: string; data: string }) =>
      client.updateArCustomer(args.customer_id, JSON.parse(args.data)),
  },

  // --- Treasury ---
  {
    name: 'treasury_accounts',
    description: 'List treasury accounts',
    inputSchema: z.object({}),
    handler: async (client) => client.listTreasuryAccounts(),
  },
  {
    name: 'treasury_transactions',
    description: 'List treasury transactions',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listTreasuryTransactions({ page: args.page }),
  },

  // --- Categories ---
  {
    name: 'categories_list',
    description: 'List transaction categories',
    inputSchema: z.object({}),
    handler: async (client) => client.listCategories(),
  },

  // --- Credit ---
  {
    name: 'credit_accounts',
    description: 'List credit accounts',
    inputSchema: z.object({}),
    handler: async (client) => client.listCreditAccounts(),
  },

  // --- Organization ---
  {
    name: 'organization_get',
    description: 'Get organization information',
    inputSchema: z.object({}),
    handler: async (client) => client.getOrganization(),
  },

  // --- Users ---
  {
    name: 'users_list',
    description: 'List organization users',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listUsers({ page: args.page }),
  },
  {
    name: 'user_get',
    description: 'Get user details by ID',
    inputSchema: z.object({
      user_id: z.string().describe('user UUID'),
    }),
    handler: async (client, args: { user_id: string }) =>
      client.getUser(args.user_id),
  },

  // --- Events ---
  {
    name: 'events_list',
    description: 'List webhook events',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listEvents({ page: args.page }),
  },
  {
    name: 'event_get',
    description: 'Get event details by ID',
    inputSchema: z.object({
      event_id: z.string().describe('event UUID'),
    }),
    handler: async (client, args: { event_id: string }) =>
      client.getEvent(args.event_id),
  },

  // --- Webhooks ---
  {
    name: 'webhooks_list',
    description: 'List webhook endpoints',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listWebhooks({ page: args.page }),
  },
  {
    name: 'webhook_get',
    description: 'Get webhook endpoint details',
    inputSchema: z.object({
      webhook_id: z.string().describe('webhook UUID'),
    }),
    handler: async (client, args: { webhook_id: string }) =>
      client.getWebhook(args.webhook_id),
  },
  {
    name: 'webhook_create',
    description: 'Create a webhook endpoint',
    inputSchema: z.object({
      url: z.string().describe('webhook URL'),
      events: z.string().optional().describe('comma-separated event types'),
    }),
    handler: async (client, args: { url: string; events?: string }) =>
      client.createWebhook({
        url: args.url,
        events: args.events ? args.events.split(',').map(e => e.trim()) : undefined,
      }),
  },
  {
    name: 'webhook_update',
    description: 'Update a webhook endpoint',
    inputSchema: z.object({
      webhook_id: z.string().describe('webhook UUID'),
      url: z.string().optional().describe('new webhook URL'),
      events: z.string().optional().describe('comma-separated event types'),
    }),
    handler: async (client, args: { webhook_id: string; url?: string; events?: string }) =>
      client.updateWebhook(args.webhook_id, {
        url: args.url,
        events: args.events ? args.events.split(',').map(e => e.trim()) : undefined,
      }),
  },

  // --- SAFEs ---
  {
    name: 'safes_list',
    description: 'List SAFE requests',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listSafes({ page: args.page }),
  },
  {
    name: 'safe_get',
    description: 'Get SAFE request details',
    inputSchema: z.object({
      safe_id: z.string().describe('SAFE request UUID'),
    }),
    handler: async (client, args: { safe_id: string }) =>
      client.getSafe(args.safe_id),
  },

  // --- Statements ---
  {
    name: 'statement_pdf',
    description: 'Get statement PDF download URL',
    inputSchema: z.object({
      statement_id: z.string().describe('statement UUID'),
    }),
    handler: async (client, args: { statement_id: string }) =>
      client.getStatementPdf(args.statement_id),
  },

  // --- Send Money Approval ---
  {
    name: 'send_money_approval_get',
    description: 'Get send money approval request',
    inputSchema: z.object({
      request_id: z.string().describe('approval request UUID'),
    }),
    handler: async (client, args: { request_id: string }) =>
      client.getSendMoneyApprovalRequest(args.request_id),
  },
];
