import { prisma } from './setup';

describe('Tags API', () => {
  const baseUrl = `http://localhost:${process.env.PORT}/api`;

  describe('GET /api/tags', () => {
    it('should return all tags', async () => {
      const response = await fetch(`${baseUrl}/tags`);
      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tags');
      expect(Array.isArray(data.tags)).toBe(true);
      expect(data.tags.length).toBeGreaterThan(0);

      // Check tag structure
      const tag = data.tags[0];
      expect(tag).toHaveProperty('id');
      expect(tag).toHaveProperty('name');
    });
  });

  describe('GET /api/tags?search=keyword', () => {
    it('should return tags matching search keyword', async () => {
      const response = await fetch(`${baseUrl}/tags?search=tech`);
      const data: any = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tags');
      expect(Array.isArray(data.tags)).toBe(true);
      
      // Should find "technology" when searching for "tech"
      const hasTechnology = data.tags.some((tag: any) => tag.name === 'technology');
      expect(hasTechnology).toBe(true);
    });

    it('should be case insensitive', async () => {
      const response = await fetch(`${baseUrl}/tags?search=TECH`);
      const data: any = await response.json();

      expect(response.status).toBe(200);
      
      // Should find "technology" even with uppercase search
      const hasTechnology = data.tags.some((tag: any) => tag.name === 'technology');
      expect(hasTechnology).toBe(true);
    });

    it('should return all tags when search is empty', async () => {
      const responseAll = await fetch(`${baseUrl}/tags`);
      const responseEmpty = await fetch(`${baseUrl}/tags?search=`);
      
      const dataAll: any = await responseAll.json();
      const dataEmpty: any = await responseEmpty.json();

      expect(responseEmpty.status).toBe(200);
      expect(dataEmpty.tags.length).toBe(dataAll.tags.length);
    });
  });
});

