import { describe, expect, it } from 'vitest';
import { leerConfig } from '../src/comun/config.js';

describe('leerConfig', () => {
  it('usa valores por defecto y separa los orígenes de CORS', () => {
    const config = leerConfig({
      DATABASE_URL: 'postgresql://x:x@localhost:5432/x',
      CORS_ORIGINS: 'http://localhost:5173, https://iri-confex.vercel.app',
    });

    expect(config.puerto).toBe(3000);
    expect(config.origenesCors).toEqual(['http://localhost:5173', 'https://iri-confex.vercel.app']);
  });

  it('falla con un mensaje claro si falta DATABASE_URL', () => {
    expect(() => leerConfig({})).toThrow(/DATABASE_URL/);
  });

  it('falla si el puerto no es un número válido', () => {
    expect(() => leerConfig({ DATABASE_URL: 'x', PORT: 'abc' })).toThrow(/PORT/);
  });

    it('en producción exige CORS_ORIGINS', () => {
    expect(() =>
      leerConfig({ DATABASE_URL: 'x', NODE_ENV: 'production' }),
    ).toThrow(/CORS_ORIGINS/);
  });

  it('en producción rechaza comodín, http y barra final', () => {
    for (const origen of ['*', 'http://iri-confex.vercel.app', 'https://iri-confex.vercel.app/']) {
      expect(() =>
        leerConfig({ DATABASE_URL: 'x', NODE_ENV: 'production', CORS_ORIGINS: origen }),
      ).toThrow(/CORS_ORIGINS/);
    }
  });

  it('en producción acepta el dominio https del frontend', () => {
    const config = leerConfig({
      DATABASE_URL: 'x',
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://iri-confex.vercel.app',
    });
    expect(config.origenesCors).toEqual(['https://iri-confex.vercel.app']);
  });
});