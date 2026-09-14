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
      maybeSingle: jest.fn(),
      update: jest.fn().mockReturnThis(),
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
});
