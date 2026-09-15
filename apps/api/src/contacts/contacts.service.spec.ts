import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let supabaseClientMock: any;

  beforeEach(async () => {
    supabaseClientMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    };

    const supabaseServiceMock = {
      client: supabaseClientMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  describe('findAll', () => {
    it('should query contacts for the user without tag filter when tag is omitted', async () => {
      const mockContacts = [
        { id: 'c1', name: 'Juan', phone: '573001111111', tags: ['Docentes'] },
        { id: 'c2', name: 'Maria', phone: '573002222222', tags: ['Cliente'] },
      ];

      supabaseClientMock.order.mockResolvedValueOnce({
        data: mockContacts,
        count: 2,
        error: null,
      });

      const result = await service.findAll('user-1', 1, 50);

      expect(supabaseClientMock.from).toHaveBeenCalledWith('contacts');
      expect(supabaseClientMock.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(supabaseClientMock.is).toHaveBeenCalledWith('deleted_at', null);
      expect(supabaseClientMock.eq).toHaveBeenCalledWith('opted_out', false);
      expect(supabaseClientMock.contains).not.toHaveBeenCalled();
      expect(result).toEqual({ data: mockContacts, total: 2, page: 1, limit: 50 });
    });

    it('should apply .contains("tags", [tag]) when tag is provided', async () => {
      const mockContacts = [
        { id: 'c1', name: 'Juan', phone: '573001111111', tags: ['Docentes'] },
      ];

      supabaseClientMock.order.mockResolvedValueOnce({
        data: mockContacts,
        count: 1,
        error: null,
      });

      const result = await service.findAll('user-1', 1, 50, 'Docentes');

      expect(supabaseClientMock.from).toHaveBeenCalledWith('contacts');
      expect(supabaseClientMock.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(supabaseClientMock.contains).toHaveBeenCalledWith('tags', ['Docentes']);
      expect(result).toEqual({ data: mockContacts, total: 1, page: 1, limit: 50 });
    });
  });

  describe('getTags', () => {
    it('should return distinct sorted tags for the user', async () => {
      supabaseClientMock.eq.mockReturnValueOnce({
        is: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({
            data: [
              { tags: ['Docentes', 'VIP'] },
              { tags: ['Cliente', 'docentes'] },
              { tags: ['Docentes'] },
              { tags: null },
            ],
            error: null,
          }),
        }),
      });

      const tags = await service.getTags('user-1');

      expect(supabaseClientMock.from).toHaveBeenCalledWith('contacts');
      expect(supabaseClientMock.select).toHaveBeenCalledWith('tags');
      expect(tags).toEqual(['Cliente', 'Docentes', 'docentes', 'VIP'].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })));
    });
  });
});
