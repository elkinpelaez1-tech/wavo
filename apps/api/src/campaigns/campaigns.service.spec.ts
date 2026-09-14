import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MetaService } from '../meta/meta.service';
import { MessageProducer } from '../queue/message.producer';
import { CreateCampaignDto } from './dto/campaign.dto';
import { BadRequestException } from '@nestjs/common';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let supabaseClientMock: any;
  let metaServiceMock: any;
  let producerMock: any;

  beforeEach(async () => {
    supabaseClientMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve({ data: [], error: null })),
    };

    const supabaseServiceMock = {
      client: supabaseClientMock,
    };

    metaServiceMock = {
      sendTemplate: jest.fn().mockResolvedValue({ messages: [{ id: 'wamid.123' }] }),
    };

    producerMock = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
        { provide: MessageProducer, useValue: producerMock },
        { provide: MetaService, useValue: metaServiceMock },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  describe('create', () => {
    it('should resolve and save the correct template language from templates table when creating a campaign', async () => {
      const mockDto: CreateCampaignDto = {
        name: 'Test Campaign en_US',
        template_name: 'hello_world',
        contact_ids: ['contact-1'],
      };

      // Mock query templates returns en_US
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: { language: 'en_US' },
        error: null,
      });

      // Mock campaign insertion
      supabaseClientMock.single.mockResolvedValue({
        data: { id: 'campaign-123', template_language: 'en_US' },
        error: null,
      });

      const result = await service.create('user-1', mockDto);

      expect(supabaseClientMock.from).toHaveBeenCalledWith('templates');
      expect(supabaseClientMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          template_language: 'en_US',
        })
      );
      expect(result.template_language).toBe('en_US');
    });

    it('should preserve es_CO if the synced template in templates is es_CO', async () => {
      const mockDto: CreateCampaignDto = {
        name: 'Test Campaign es_CO',
        template_name: 'promo_nueva_york_2026',
        contact_ids: ['contact-1'],
      };

      // Mock templates returns es_CO
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: { language: 'es_CO' },
        error: null,
      });

      // Mock campaign insertion
      supabaseClientMock.single.mockResolvedValue({
        data: { id: 'campaign-124', template_language: 'es_CO' },
        error: null,
      });

      const result = await service.create('user-1', mockDto);

      expect(supabaseClientMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          template_language: 'es_CO',
        })
      );
      expect(result.template_language).toBe('es_CO');
    });

    it('should block campaign creation and throw BadRequestException if the template does not exist in templates table', async () => {
      const mockDto: CreateCampaignDto = {
        name: 'Test Blocked',
        template_name: 'non_existent_template',
        contact_ids: ['contact-1'],
      };

      // Mock templates returns null/not found
      supabaseClientMock.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.create('user-1', mockDto)).rejects.toThrow(BadRequestException);
      expect(supabaseClientMock.insert).not.toHaveBeenCalled();
    });
  });

  describe('enqueueCampaign', () => {
    it('should pass campaign.template_language as the 5th parameter to sendTemplate during campaign launch', async () => {
      const mockCampaign = {
        id: 'campaign-123',
        name: 'Launch Test Campaign',
        template_name: 'hello_world',
        template_language: 'en_US',
        image_url: null,
      };

      // Mock recipients selection using thenable chain
      supabaseClientMock.then.mockImplementation((resolve: any) => {
        resolve({
          data: [
            {
              contact_id: 'contact-1',
              contacts: { phone_normalized: '573217452834', opted_out: false, deleted_at: null },
            },
          ],
          error: null,
        });
      });

      // Mock currentCampaign query for count
      supabaseClientMock.single.mockResolvedValue({
        data: { sent_count: 0 },
        error: null,
      });

      await (service as any).enqueueCampaign(mockCampaign);

      expect(metaServiceMock.sendTemplate).toHaveBeenCalledWith(
        '573217452834',
        'hello_world',
        [],
        null,
        'en_US'
      );
    });
  });

  describe('findAll and getStats metrics calculation', () => {
    it('should aggregate delivered_count = delivered + read and read_count = read in findAll', async () => {
      supabaseClientMock.then.mockImplementation((resolve: any) => {
        resolve({
          data: [
            {
              id: 'c1',
              name: 'Campaign 1',
              sent_count: 3,
              campaign_recipients: [
                { status: 'sent' },
                { status: 'delivered' },
                { status: 'read' },
              ],
            },
          ],
          error: null,
        });
      });

      const results = await service.findAll('user-1');

      expect(results[0].sent_count).toBe(3);
      expect(results[0].delivered_count).toBe(2); // 1 delivered + 1 read
      expect(results[0].read_count).toBe(1);      // 1 read
      expect(results[0].stats).toEqual({
        pending: 0,
        sent: 3,
        delivered: 2,
        read: 1,
        failed: 0,
      });
    });

    it('should calculate stats correctly in getStats', async () => {
      // Mock findOne
      supabaseClientMock.single.mockResolvedValue({
        data: {
          id: 'c1',
          name: 'Campaign 1',
          sent_count: 4,
          user_id: 'user-1',
        },
        error: null,
      });

      // Mock campaign_recipients query
      supabaseClientMock.then.mockImplementation((resolve: any) => {
        resolve({
          data: [
            { status: 'sent' },
            { status: 'delivered' },
            { status: 'read' },
            { status: 'failed' },
          ],
          error: null,
        });
      });

      const result = await service.getStats('c1', 'user-1');

      expect(result.sent_count).toBe(4);
      expect(result.delivered_count).toBe(2); // 1 delivered + 1 read
      expect(result.read_count).toBe(1);
      expect(result.failed_count).toBe(1);
      expect(result.stats).toEqual({
        pending: 0,
        sent: 4,
        delivered: 2,
        read: 1,
        failed: 1,
      });
    });
  });
});
