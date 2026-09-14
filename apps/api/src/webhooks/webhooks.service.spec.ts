import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let supabaseClientMock: any;

  beforeEach(async () => {
    supabaseClientMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    };

    const supabaseServiceMock = {
      client: supabaseClientMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  describe('processPayload - Status updates', () => {
    it('should update status to delivered and set delivered_at when message is sent', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: {
          id: 'recipient-1',
          status: 'sent',
          delivered_at: null,
          read_at: null,
        },
        error: null,
      });

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  statuses: [
                    {
                      id: 'wamid.test-123',
                      status: 'delivered',
                      timestamp: '1726000000',
                      recipient_id: '57300000000',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      expect(supabaseClientMock.from).toHaveBeenCalledWith('campaign_recipients');
      expect(supabaseClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'delivered',
          delivered_at: expect.any(String),
        })
      );
      expect(supabaseClientMock.eq).toHaveBeenCalledWith('id', 'recipient-1');
    });

    it('should update status to read and set both read_at and delivered_at if delivered_at was missing', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: {
          id: 'recipient-2',
          status: 'sent',
          delivered_at: null,
          read_at: null,
        },
        error: null,
      });

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  statuses: [
                    {
                      id: 'wamid.test-456',
                      status: 'read',
                      timestamp: '1726000000',
                      recipient_id: '57300000000',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      expect(supabaseClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'read',
          read_at: expect.any(String),
          delivered_at: expect.any(String),
        })
      );
    });

    it('should prevent status regression from read to delivered when out-of-order events arrive', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: {
          id: 'recipient-3',
          status: 'read',
          delivered_at: '2026-09-14T10:00:00Z',
          read_at: '2026-09-14T10:05:00Z',
        },
        error: null,
      });

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  statuses: [
                    {
                      id: 'wamid.test-out-of-order',
                      status: 'delivered',
                      timestamp: '1726000000',
                      recipient_id: '57300000000',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      // Verify updateData did NOT set status to 'delivered'
      expect(supabaseClientMock.update).toHaveBeenCalledWith(
        expect.not.objectContaining({
          status: 'delivered',
        })
      );
    });

    it('should record error message on failed status', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: {
          id: 'recipient-4',
          status: 'sent',
          delivered_at: null,
          read_at: null,
        },
        error: null,
      });

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  statuses: [
                    {
                      id: 'wamid.test-failed',
                      status: 'failed',
                      timestamp: '1726000000',
                      recipient_id: '57300000000',
                      errors: [
                        {
                          code: 131026,
                          title: 'Message Undeliverable',
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      expect(supabaseClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: '[131026] Message Undeliverable',
        })
      );
    });
  });

  describe('processPayload - Incoming Messages (handleIncoming)', () => {
    const mockContact = {
      id: 'contact-uuid-1',
      user_id: 'user-uuid-1',
    };

    it('1. should save an incoming text message into messages table and create conversation if not exists', async () => {
      // Mock flow:
      // 1. contacts search -> returns mockContact
      // 2. messages idempotency check -> returns null
      // 3. conversations search -> returns null (new conversation)
      // 4. conversations insert -> returns new conversation id
      // 5. messages insert -> success

      supabaseClientMock.maybeSingle
        .mockResolvedValueOnce({ data: mockContact, error: null }) // contacts
        .mockResolvedValueOnce({ data: null, error: null })        // messages (idempotency)
        .mockResolvedValueOnce({ data: null, error: null });       // conversations (existing)

      supabaseClientMock.single.mockResolvedValueOnce({
        data: { id: 'conv-new-uuid' },
        error: null,
      });

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  messages: [
                    {
                      from: '573117287366',
                      id: 'wamid.incoming-001',
                      timestamp: '1726000000',
                      type: 'text',
                      text: { body: 'Quiero más información' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      // Verify conversation created
      expect(supabaseClientMock.from).toHaveBeenCalledWith('conversations');
      expect(supabaseClientMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-uuid-1',
          contact_id: 'contact-uuid-1',
          status: 'open',
          unread_count: 1,
          last_message_text: 'Quiero más información',
        })
      );

      // Verify message inserted
      expect(supabaseClientMock.from).toHaveBeenCalledWith('messages');
      expect(supabaseClientMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation_id: 'conv-new-uuid',
          user_id: 'user-uuid-1',
          contact_id: 'contact-uuid-1',
          direction: 'inbound',
          sender_type: 'contact',
          message_type: 'text',
          body: 'Quiero más información',
          meta_message_id: 'wamid.incoming-001',
          status: 'delivered',
        })
      );
    });

    it('2 & 3 & 4 & 5. should reuse existing conversation, increment unread_count and update last_message', async () => {
      const existingConv = {
        id: 'conv-existing-uuid',
        unread_count: 2,
        last_campaign_id: null,
      };

      supabaseClientMock.maybeSingle
        .mockResolvedValueOnce({ data: mockContact, error: null }) // contacts
        .mockResolvedValueOnce({ data: null, error: null })        // messages (idempotency)
        .mockResolvedValueOnce({ data: existingConv, error: null }); // conversations (existing)

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  messages: [
                    {
                      from: '+57 311 728 7366',
                      id: 'wamid.incoming-002',
                      timestamp: '1726000100',
                      type: 'text',
                      text: { body: '¿Cuál es el precio?' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      // Verify conversation updated with unread_count = 3
      expect(supabaseClientMock.from).toHaveBeenCalledWith('conversations');
      expect(supabaseClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_message_text: '¿Cuál es el precio?',
          unread_count: 3,
        })
      );
      expect(supabaseClientMock.eq).toHaveBeenCalledWith('id', 'conv-existing-uuid');

      // Verify message inserted with existing conversation_id
      expect(supabaseClientMock.from).toHaveBeenCalledWith('messages');
      expect(supabaseClientMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation_id: 'conv-existing-uuid',
          body: '¿Cuál es el precio?',
          meta_message_id: 'wamid.incoming-002',
        })
      );
    });

    it('6. should link reply to campaign when context.id matches campaign_recipients.message_id', async () => {
      supabaseClientMock.maybeSingle
        .mockResolvedValueOnce({ data: mockContact, error: null })                   // contacts
        .mockResolvedValueOnce({ data: null, error: null })                          // messages (idempotency)
        .mockResolvedValueOnce({ data: { campaign_id: 'campaign-abc-123' }, error: null }) // campaign_recipients
        .mockResolvedValueOnce({ data: null, error: null });                         // conversations (new)

      supabaseClientMock.single.mockResolvedValueOnce({
        data: { id: 'conv-campaign-linked' },
        error: null,
      });

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  messages: [
                    {
                      from: '573117287366',
                      id: 'wamid.incoming-context-reply',
                      timestamp: '1726000200',
                      type: 'text',
                      text: { body: 'Sí me interesa la promo' },
                      context: {
                        id: 'wamid.outbound-campaign-msg',
                        from: '15550001111',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      // Verify conversation created with last_campaign_id
      expect(supabaseClientMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          last_campaign_id: 'campaign-abc-123',
        })
      );

      // Verify message inserted with context_message_id
      expect(supabaseClientMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          context_message_id: 'wamid.outbound-campaign-msg',
        })
      );
    });

    it('7. should not insert duplicate message when meta_message_id already exists (idempotency)', async () => {
      supabaseClientMock.maybeSingle
        .mockResolvedValueOnce({ data: mockContact, error: null })              // contacts
        .mockResolvedValueOnce({ data: { id: 'msg-already-saved' }, error: null }); // messages (already exists)

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  messages: [
                    {
                      from: '573117287366',
                      id: 'wamid.duplicate-msg',
                      timestamp: '1726000300',
                      type: 'text',
                      text: { body: 'Mensaje repetido' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      // Verify no conversation or message was inserted/updated after idempotency check
      expect(supabaseClientMock.insert).not.toHaveBeenCalled();
    });

    it('8. should perform opt-out when body is STOP / CANCELAR / BAJA and still process message', async () => {
      supabaseClientMock.maybeSingle
        .mockResolvedValueOnce({ data: mockContact, error: null }) // contacts
        .mockResolvedValueOnce({ data: null, error: null })        // messages (idempotency)
        .mockResolvedValueOnce({ data: { id: 'conv-optout' }, error: null }); // conversations

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  messages: [
                    {
                      from: '573117287366',
                      id: 'wamid.optout-stop',
                      timestamp: '1726000400',
                      type: 'text',
                      text: { body: 'STOP' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.processPayload(payload);

      // Verify contacts updated with opted_out = true
      expect(supabaseClientMock.from).toHaveBeenCalledWith('contacts');
      expect(supabaseClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          opted_out: true,
          opted_out_at: expect.any(String),
        })
      );

      // Verify message was still recorded in messages table
      expect(supabaseClientMock.from).toHaveBeenCalledWith('messages');
      expect(supabaseClientMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'STOP',
          meta_message_id: 'wamid.optout-stop',
        })
      );
    });

    it('9. should not throw or break the webhook when contact does not exist', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValueOnce({
        data: null, // contact not found
        error: null,
      });

      const payload: any = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-1',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                  messages: [
                    {
                      from: '573999999999',
                      id: 'wamid.unknown-contact',
                      timestamp: '1726000500',
                      type: 'text',
                      text: { body: 'Hola desconocido' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await expect(service.processPayload(payload)).resolves.not.toThrow();
      // Should not attempt to insert conversation or message
      expect(supabaseClientMock.insert).not.toHaveBeenCalled();
    });
  });
});
