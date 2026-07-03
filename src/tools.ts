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
    description: 'Transfer funds between two Mercury accounts',
    inputSchema: z.object({
      source_account_id: z.string().describe('source account UUID'),
      destination_account_id: z.string().describe('destination account UUID'),
      amount: z.number().describe('transfer amount in dollars'),
      note: z.string().optional().describe('transfer note'),
      idempotency_key: z.string().optional().describe('idempotency key'),
    }),
    handler: async (client, args: {
      source_account_id: string; destination_account_id: string;
      amount: number; note?: string; idempotency_key?: string;
    }) => client.createInternalTransfer({
      sourceAccountId: args.source_account_id,
      destinationAccountId: args.destination_account_id,
      amount: args.amount,
      note: args.note,
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
    name: 'transaction_attachment_upload',
    description: 'Upload an attachment to a transaction from a local file path',
    inputSchema: z.object({
      transaction_id: z.string().describe('transaction UUID'),
      file_path: z.string().describe('absolute path to the file to upload'),
    }),
    handler: async (client, args: { transaction_id: string; file_path: string }) =>
      client.uploadTransactionAttachment(args.transaction_id, args.file_path),
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
  {
    name: 'request_send_money',
    description: 'Queue a payment to a recipient that requires web approval (no IP whitelist needed)',
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
    }) => client.requestSendMoney(args.account_id, {
      recipientId: args.recipient_id,
      amount: args.amount,
      paymentMethod: args.payment_method,
      idempotencyKey: args.idempotency_key,
      memo: args.memo,
      note: args.note,
    }),
  },
  {
    name: 'send_money_approval_requests_list',
    description: 'List send money approval requests',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listSendMoneyApprovalRequests({ page: args.page }),
  },

  // --- Cards ---
  {
    name: 'cards_list',
    description: 'List all cards across the organization',
    inputSchema: z.object({}),
    handler: async (client) => client.listCards(),
  },
  {
    name: 'card_create',
    description: 'Create a new card',
    inputSchema: z.object({
      user_id: z.string().describe('user UUID the card belongs to'),
      type: z.string().describe('card type (e.g. virtual, physical)'),
      kind: z.string().describe('card kind (e.g. debit, credit)'),
      account_id: z.string().optional().describe('account UUID to associate'),
      nickname: z.string().optional().describe('card nickname'),
      spend_limit: z.string().optional().describe('spend limit JSON (amountCents, interval)'),
    }),
    handler: async (client, args: {
      user_id: string; type: string; kind: string;
      account_id?: string; nickname?: string; spend_limit?: string;
    }) => client.createCard({
      userId: args.user_id,
      type: args.type,
      kind: args.kind,
      accountId: args.account_id,
      nickname: args.nickname,
      spendLimit: args.spend_limit ? JSON.parse(args.spend_limit) : undefined,
    }),
  },
  {
    name: 'card_get',
    description: 'Get card details by ID',
    inputSchema: z.object({
      card_id: z.string().describe('card UUID'),
    }),
    handler: async (client, args: { card_id: string }) =>
      client.getCard(args.card_id),
  },
  {
    name: 'card_update',
    description: 'Update card nickname or spend limit',
    inputSchema: z.object({
      card_id: z.string().describe('card UUID'),
      nickname: z.string().optional().describe('new nickname'),
      spend_limit: z.string().optional().describe('spend limit JSON (amountCents, interval)'),
    }),
    handler: async (client, args: { card_id: string; nickname?: string; spend_limit?: string }) =>
      client.updateCard(args.card_id, {
        nickname: args.nickname,
        spendLimit: args.spend_limit ? JSON.parse(args.spend_limit) : undefined,
      }),
  },
  {
    name: 'card_cancel',
    description: 'Cancel a card',
    inputSchema: z.object({
      card_id: z.string().describe('card UUID'),
    }),
    handler: async (client, args: { card_id: string }) =>
      client.cancelCard(args.card_id),
  },
  {
    name: 'card_freeze',
    description: 'Freeze a card',
    inputSchema: z.object({
      card_id: z.string().describe('card UUID'),
    }),
    handler: async (client, args: { card_id: string }) =>
      client.freezeCard(args.card_id),
  },
  {
    name: 'card_unfreeze',
    description: 'Unfreeze a card',
    inputSchema: z.object({
      card_id: z.string().describe('card UUID'),
    }),
    handler: async (client, args: { card_id: string }) =>
      client.unfreezeCard(args.card_id),
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
    name: 'recipient_delete',
    description: 'Delete a recipient',
    inputSchema: z.object({
      recipient_id: z.string().describe('recipient UUID'),
    }),
    handler: async (client, args: { recipient_id: string }) =>
      client.deleteRecipient(args.recipient_id),
  },
  {
    name: 'recipient_attachments',
    description: 'List all recipient attachments across the organization',
    inputSchema: z.object({}),
    handler: async (client) => client.listRecipientAttachments(),
  },
  {
    name: 'recipient_attachment_upload',
    description: 'Upload an attachment to a recipient from a local file path',
    inputSchema: z.object({
      recipient_id: z.string().describe('recipient UUID'),
      file_path: z.string().describe('absolute path to the file to upload'),
    }),
    handler: async (client, args: { recipient_id: string; file_path: string }) =>
      client.uploadRecipientAttachment(args.recipient_id, args.file_path),
  },

  // --- Recipient Invites ---
  {
    name: 'recipient_invites_list',
    description: 'List recipient invites',
    inputSchema: z.object({
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { page?: string }) =>
      client.listRecipientInvites({ page: args.page }),
  },
  {
    name: 'recipient_invite_create',
    description: 'Create a recipient invite',
    inputSchema: z.object({
      name: z.string().describe('recipient name'),
      contact_email: z.string().optional().describe('contact email'),
      notes: z.string().optional().describe('notes'),
      organization_name_on_request: z.string().optional().describe('org name shown on request'),
      payment_methods: z.string().optional().describe('comma-separated payment methods'),
      recipient_id: z.string().optional().describe('existing recipient UUID'),
      require_tax_document: z.boolean().optional().describe('require a tax document'),
      send_email: z.boolean().optional().describe('send an invite email'),
    }),
    handler: async (client, args: {
      name: string; contact_email?: string; notes?: string;
      organization_name_on_request?: string; payment_methods?: string;
      recipient_id?: string; require_tax_document?: boolean; send_email?: boolean;
    }) => client.createRecipientInvite({
      name: args.name,
      contactEmail: args.contact_email,
      notes: args.notes,
      organizationNameOnRequest: args.organization_name_on_request,
      paymentMethods: args.payment_methods ? args.payment_methods.split(',').map(p => p.trim()) : undefined,
      recipientId: args.recipient_id,
      requireTaxDocument: args.require_tax_document,
      sendEmail: args.send_email,
    }),
  },
  {
    name: 'recipient_invite_get',
    description: 'Get a recipient invite by ID',
    inputSchema: z.object({
      invite_id: z.string().describe('invite UUID'),
    }),
    handler: async (client, args: { invite_id: string }) =>
      client.getRecipientInvite(args.invite_id),
  },
  {
    name: 'recipient_invite_delete',
    description: 'Delete a recipient invite',
    inputSchema: z.object({
      invite_id: z.string().describe('invite UUID'),
    }),
    handler: async (client, args: { invite_id: string }) =>
      client.deleteRecipientInvite(args.invite_id),
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
  {
    name: 'ar_attachment_get',
    description: 'Get an AR attachment by ID',
    inputSchema: z.object({
      attachment_id: z.string().describe('attachment UUID'),
    }),
    handler: async (client, args: { attachment_id: string }) =>
      client.getArAttachment(args.attachment_id),
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
  {
    name: 'ar_customer_delete',
    description: 'Delete an AR customer',
    inputSchema: z.object({
      customer_id: z.string().describe('customer ID'),
    }),
    handler: async (client, args: { customer_id: string }) =>
      client.deleteArCustomer(args.customer_id),
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
    description: 'List transactions for a treasury account',
    inputSchema: z.object({
      treasury_id: z.string().describe('treasury account UUID'),
      page: z.string().optional().describe('pagination cursor'),
    }),
    handler: async (client, args: { treasury_id: string; page?: string }) =>
      client.listTreasuryTransactions(args.treasury_id, { page: args.page }),
  },
  {
    name: 'treasury_statements',
    description: 'List statements for a treasury account',
    inputSchema: z.object({
      treasury_id: z.string().describe('treasury account UUID'),
    }),
    handler: async (client, args: { treasury_id: string }) =>
      client.listTreasuryStatements(args.treasury_id),
  },

  // --- Categories ---
  {
    name: 'categories_list',
    description: 'List transaction categories',
    inputSchema: z.object({}),
    handler: async (client) => client.listCategories(),
  },
  {
    name: 'category_create',
    description: 'Create a new transaction category',
    inputSchema: z.object({
      name: z.string().describe('category name'),
      visible_for_card_spend: z.boolean().describe('visible for card spend'),
      visible_for_other: z.boolean().describe('visible for other transactions'),
      visible_for_reimbursements: z.boolean().describe('visible for reimbursements'),
    }),
    handler: async (client, args: {
      name: string; visible_for_card_spend: boolean;
      visible_for_other: boolean; visible_for_reimbursements: boolean;
    }) => client.createCategory({
      name: args.name,
      visibleForCardSpend: args.visible_for_card_spend,
      visibleForOther: args.visible_for_other,
      visibleForReimbursements: args.visible_for_reimbursements,
    }),
  },
  {
    name: 'category_edit',
    description: 'Edit a transaction category',
    inputSchema: z.object({
      category_id: z.string().describe('category UUID'),
      name: z.string().optional().describe('category name'),
      visible_for_card_spend: z.boolean().optional().describe('visible for card spend'),
      visible_for_other: z.boolean().optional().describe('visible for other transactions'),
      visible_for_reimbursements: z.boolean().optional().describe('visible for reimbursements'),
    }),
    handler: async (client, args: {
      category_id: string; name?: string; visible_for_card_spend?: boolean;
      visible_for_other?: boolean; visible_for_reimbursements?: boolean;
    }) => client.editCategory(args.category_id, {
      name: args.name,
      visibleForCardSpend: args.visible_for_card_spend,
      visibleForOther: args.visible_for_other,
      visibleForReimbursements: args.visible_for_reimbursements,
    }),
  },
  {
    name: 'category_delete',
    description: 'Delete a transaction category',
    inputSchema: z.object({
      category_id: z.string().describe('category UUID'),
    }),
    handler: async (client, args: { category_id: string }) =>
      client.deleteCategory(args.category_id),
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
      event_types: z.string().optional().describe('comma-separated event types'),
      filter_paths: z.string().optional().describe('comma-separated filter paths'),
    }),
    handler: async (client, args: { url: string; event_types?: string; filter_paths?: string }) =>
      client.createWebhook({
        url: args.url,
        eventTypes: args.event_types ? args.event_types.split(',').map(e => e.trim()) : undefined,
        filterPaths: args.filter_paths ? args.filter_paths.split(',').map(e => e.trim()) : undefined,
      }),
  },
  {
    name: 'webhook_update',
    description: 'Update a webhook endpoint',
    inputSchema: z.object({
      webhook_id: z.string().describe('webhook UUID'),
      url: z.string().optional().describe('new webhook URL'),
      event_types: z.string().optional().describe('comma-separated event types'),
      filter_paths: z.string().optional().describe('comma-separated filter paths'),
      status: z.string().optional().describe('webhook status'),
    }),
    handler: async (client, args: {
      webhook_id: string; url?: string; event_types?: string;
      filter_paths?: string; status?: string;
    }) => client.updateWebhook(args.webhook_id, {
      url: args.url,
      eventTypes: args.event_types ? args.event_types.split(',').map(e => e.trim()) : undefined,
      filterPaths: args.filter_paths ? args.filter_paths.split(',').map(e => e.trim()) : undefined,
      status: args.status,
    }),
  },
  {
    name: 'webhook_delete',
    description: 'Delete a webhook endpoint',
    inputSchema: z.object({
      webhook_id: z.string().describe('webhook UUID'),
    }),
    handler: async (client, args: { webhook_id: string }) =>
      client.deleteWebhook(args.webhook_id),
  },
  {
    name: 'webhook_verify',
    description: 'Send a verification event to a webhook endpoint',
    inputSchema: z.object({
      webhook_id: z.string().describe('webhook UUID'),
      event_type: z.string().describe('event type to send'),
    }),
    handler: async (client, args: { webhook_id: string; event_type: string }) =>
      client.verifyWebhook(args.webhook_id, args.event_type),
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
  {
    name: 'safe_document',
    description: 'Download a SAFE document',
    inputSchema: z.object({
      safe_id: z.string().describe('SAFE request UUID'),
    }),
    handler: async (client, args: { safe_id: string }) =>
      client.getSafeDocument(args.safe_id),
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
    description: 'Get send money approval request by ID',
    inputSchema: z.object({
      request_id: z.string().describe('approval request UUID'),
    }),
    handler: async (client, args: { request_id: string }) =>
      client.getSendMoneyApprovalRequest(args.request_id),
  },

  // --- Onboarding ---
  {
    name: 'onboarding_submit',
    description: 'Submit onboarding data for a new account application',
    inputSchema: z.object({
      data: z.string().describe('onboarding payload JSON (partner, beneficialOwners, etc)'),
    }),
    handler: async (client, args: { data: string }) =>
      client.submitOnboardingData(JSON.parse(args.data)),
  },

  // --- Books: Chart of Accounts Templates ---
  {
    name: 'coa_templates_list',
    description: 'List all Chart of Accounts templates',
    inputSchema: z.object({}),
    handler: async (client) => client.listCoaTemplates(),
  },
  {
    name: 'coa_template_create',
    description: 'Create a Chart of Accounts template',
    inputSchema: z.object({
      data: z.string().describe('COA template payload JSON'),
    }),
    handler: async (client, args: { data: string }) =>
      client.createCoaTemplate(JSON.parse(args.data)),
  },
  {
    name: 'coa_template_get',
    description: 'Retrieve a Chart of Accounts template by ID',
    inputSchema: z.object({
      coa_template_id: z.string().describe('COA template UUID'),
    }),
    handler: async (client, args: { coa_template_id: string }) =>
      client.getCoaTemplate(args.coa_template_id),
  },
  {
    name: 'coa_template_delete',
    description: 'Delete a Chart of Accounts template',
    inputSchema: z.object({
      coa_template_id: z.string().describe('COA template UUID'),
    }),
    handler: async (client, args: { coa_template_id: string }) =>
      client.deleteCoaTemplate(args.coa_template_id),
  },

  // --- Books: Ledger Templates ---
  {
    name: 'ledger_template_create',
    description: 'Create a ledger template',
    inputSchema: z.object({
      data: z.string().describe('ledger template payload JSON'),
    }),
    handler: async (client, args: { data: string }) =>
      client.createLedgerTemplate(JSON.parse(args.data)),
  },
  {
    name: 'ledger_template_update',
    description: 'Update a ledger template',
    inputSchema: z.object({
      ledger_id: z.string().describe('ledger template UUID'),
      data: z.string().describe('ledger template update payload JSON'),
    }),
    handler: async (client, args: { ledger_id: string; data: string }) =>
      client.updateLedgerTemplate(args.ledger_id, JSON.parse(args.data)),
  },
  {
    name: 'ledger_template_delete',
    description: 'Delete a ledger template',
    inputSchema: z.object({
      ledger_id: z.string().describe('ledger template UUID'),
    }),
    handler: async (client, args: { ledger_id: string }) =>
      client.deleteLedgerTemplate(args.ledger_id),
  },

  // --- Books: Journal Entries ---
  {
    name: 'journal_entries_list',
    description: 'List all journal entries for a books ledger',
    inputSchema: z.object({
      books_id: z.string().describe('books ledger UUID'),
    }),
    handler: async (client, args: { books_id: string }) =>
      client.listJournalEntries(args.books_id),
  },
  {
    name: 'journal_entries_create',
    description: 'Create multiple journal entries for a books ledger',
    inputSchema: z.object({
      books_id: z.string().describe('books ledger UUID'),
      data: z.string().describe('journal entries payload JSON (array)'),
    }),
    handler: async (client, args: { books_id: string; data: string }) =>
      client.createJournalEntries(args.books_id, JSON.parse(args.data)),
  },
  {
    name: 'journal_entries_update',
    description: 'Bulk update journal entries for a books ledger',
    inputSchema: z.object({
      books_id: z.string().describe('books ledger UUID'),
      data: z.string().describe('journal entries update payload JSON (array)'),
    }),
    handler: async (client, args: { books_id: string; data: string }) =>
      client.updateJournalEntries(args.books_id, JSON.parse(args.data)),
  },
  {
    name: 'journal_entries_delete',
    description: 'Bulk delete journal entries for a books ledger',
    inputSchema: z.object({
      books_id: z.string().describe('books ledger UUID'),
      data: z.string().optional().describe('optional payload JSON identifying entries to delete'),
    }),
    handler: async (client, args: { books_id: string; data?: string }) =>
      client.deleteJournalEntries(args.books_id, args.data ? JSON.parse(args.data) : undefined),
  },
  {
    name: 'journal_entry_get',
    description: 'Retrieve a single journal entry',
    inputSchema: z.object({
      books_id: z.string().describe('books ledger UUID'),
      journal_entry_id: z.string().describe('journal entry UUID'),
    }),
    handler: async (client, args: { books_id: string; journal_entry_id: string }) =>
      client.getJournalEntry(args.books_id, args.journal_entry_id),
  },
];
