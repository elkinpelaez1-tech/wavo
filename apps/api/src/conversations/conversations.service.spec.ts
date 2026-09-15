import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotFoundException } from '@nestjs/common';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let supabaseClientMock: any;

  const mockUser = 'user-uuid-123';
  const mockConversation = {
    id: 'conv-1',
    user_id: mockUser,
    contact_id: 'contact-1',
    last_campaign_id: 'campaign-1',
    status: 'open',
    unread_count: 2,
    last_message_text: 'Hola, tengo una duda',
    last_message_at: '2026-09-15T12:00:00Z',
    contacts: {
      id: 'contact-1',
      name: 'Maria Perez',
      phone: '+573001234567',
      phone_normalized: '573001234567',
      tags: ['vip'],
      custom_fields: { ciudad: 'Medellin' },
      opted_out: false,
    },
    campaigns: {
      id: 'campaign-1',
      name: 'Promo Septiembre',
    },
  };

  beforeEach(async () => {
    supabaseClientMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
      then: jest.fn((resolve) => resolve({ data: [mockConversation], error: null })),
    };

    const supabaseServiceMock = {
      client: supabaseClientMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  describe('findAll', () => {
    it('should return conversations formatted with contact and campaign', async () => {
      const results = await service.findAll(mockUser);

      expect(supabaseClientMock.from).toHaveBeenCalledWith('conversations');
      expect(supabaseClientMock.eq).toHaveBeenCalledWith('user_id', mockUser);
      expect(results).toHaveLength(1);
      expect(results[0].contact.name).toBe('Maria Perez');
      expect(results[0].campaign.name).toBe('Promo Septiembre');
      expect(results[0].unread_count).toBe(2);
    });

    it('should filter conversations by search term matching contact name or message', async () => {
      supabaseClientMock.then.mockImplementation((resolve: any) => {
        resolve({
          data: [
            mockConversation,
            {
              id: 'conv-2',
              user_id: mockUser,
              contact_id: 'contact-2',
              last_message_text: 'Otro mensaje',
              contacts: {
                id: 'contact-2',
                name: 'Carlos Ruiz',
                phone: '+573119999999',
                phone_normalized: '573119999999',
              },
            },
          ],
          error: null,
        });
      });

      const results = await service.findAll(mockUser, 'Maria');
      expect(results).toHaveLength(1);
      expect(results[0].contact.name).toBe('Maria Perez');

      const resultsByMsg = await service.findAll(mockUser, 'duda');
      expect(resultsByMsg).toHaveLength(1);
      expect(resultsByMsg[0].last_message_text).toBe('Hola, tengo una duda');
    });
  });

  describe('findOne', () => {
    it('should return a single conversation if found', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: mockConversation,
        error: null,
      });

      const result = await service.findOne('conv-1', mockUser);

      expect(result.id).toBe('conv-1');
      expect(result.contact.name).toBe('Maria Perez');
    });

    it('should throw NotFoundException if conversation is not found', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.findOne('non-existent', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMessages', () => {
    it('should return conversation details and list of messages ordered chronologically', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: mockConversation,
        error: null,
      });

      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          direction: 'outbound',
          body: 'Hola Maria!',
          created_at: '2026-09-15T11:59:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: 'conv-1',
          direction: 'inbound',
          body: 'Hola, tengo una duda',
          created_at: '2026-09-15T12:00:00Z',
        },
      ];

      supabaseClientMock.then.mockImplementation((resolve: any) => {
        resolve({ data: mockMessages, error: null });
      });

      const result = await service.getMessages('conv-1', mockUser);

      expect(result.conversation.id).toBe('conv-1');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].body).toBe('Hola Maria!');
      expect(result.messages[1].body).toBe('Hola, tengo una duda');
    });
  });

  describe('markAsRead', () => {
    it('should set unread_count to 0 and return updated conversation', async () => {
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: mockConversation,
        error: null,
      });

      supabaseClientMock.single.mockResolvedValue({
        data: { ...mockConversation, unread_count: 0 },
        error: null,
      });

      const result = await service.markAsRead('conv-1', mockUser);

      expect(supabaseClientMock.from).toHaveBeenCalledWith('conversations');
      expect(supabaseClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          unread_count: 0,
        })
      );
      expect(result.unread_count).toBe(0);
    });
  });
});
