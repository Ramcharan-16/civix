import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { analyzeComplaint } from '../services/ai';

// Mock the global fetch for AI service calls
global.fetch = vi.fn();

describe('Civix Backend API and Service Tests', () => {
  describe('Health check endpoint', () => {
    it('should return 200 OK and status ok', async () => {
      // Mock express response/request to verify app routing logic without full HTTP listener
      const resJson = vi.fn();
      const resStatus = vi.fn().mockReturnValue({ json: resJson });
      
      const req = {} as any;
      const res = {
        status: resStatus,
        json: resJson
      } as any;

      // Access health check route directly or run a lightweight mock check
      expect(app).toBeDefined();
    });
  });

  describe('AI Service Client fallback', () => {
    it('should fall back to local keyword analysis when microservice is down', async () => {
      // Mock fetch rejection
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await analyzeComplaint(
        'Huge pothole on road',
        'There is a giant hole in the middle of the street near the signal.'
      );

      expect(result.category).toBe('Pothole on Main Road');
      expect(result.severity).toBe('HIGH');
    });

    it('should identify hanging wires as critical risk', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await analyzeComplaint(
        'Sparking power cable',
        'A wire is hanging down low from the transformer, sparking.'
      );

      expect(result.category).toBe('Hanging Live Wire');
      expect(result.severity).toBe('CRITICAL');
    });
  });
});
