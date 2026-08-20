import metaEn from '../data/en/meta.json';
import navEn from '../data/en/nav.json';
import heroEn from '../data/en/hero.json';
import advantagesEn from '../data/en/advantages.json';
import includesEn from '../data/en/includes.json';
import kitsEn from '../data/en/kits.json';
import sensorsEn from '../data/en/sensors.json';
import topicsEn from '../data/en/topics.json';
import softwareEn from '../data/en/software.json';
import aiEn from '../data/en/ai.json';
import gameEn from '../data/en/game.json';
import ctaEn from '../data/en/cta.json';
import footerEn from '../data/en/footer.json';
import roboticsEn from '../data/en/robotics.json';

import metaUk from '../data/uk/meta.json';
import navUk from '../data/uk/nav.json';
import heroUk from '../data/uk/hero.json';
import advantagesUk from '../data/uk/advantages.json';
import includesUk from '../data/uk/includes.json';
import kitsUk from '../data/uk/kits.json';
import sensorsUk from '../data/uk/sensors.json';
import topicsUk from '../data/uk/topics.json';
import softwareUk from '../data/uk/software.json';
import aiUk from '../data/uk/ai.json';
import gameUk from '../data/uk/game.json';
import ctaUk from '../data/uk/cta.json';
import footerUk from '../data/uk/footer.json';
import roboticsUk from '../data/uk/robotics.json';

export type Locale = 'uk' | 'en';

const en = { ...metaEn, ...navEn, ...heroEn, ...advantagesEn, ...includesEn, ...kitsEn, ...sensorsEn, ...topicsEn, ...softwareEn, ...aiEn, ...gameEn, ...ctaEn, ...footerEn, ...roboticsEn };
const uk = { ...metaUk, ...navUk, ...heroUk, ...advantagesUk, ...includesUk, ...kitsUk, ...sensorsUk, ...topicsUk, ...softwareUk, ...aiUk, ...gameUk, ...ctaUk, ...footerUk, ...roboticsUk };

const locales: Record<Locale, Record<string, unknown>> = { en, uk };

export function getLocaleData(locale: Locale): Record<string, unknown> {
  return locales[locale] ?? en;
}

export function t(locale: Locale, key: string): string {
  const data = getLocaleData(locale);
  const val = data[key];
  if (val === undefined) return key;
  return String(val);
}

export function tArray<T>(locale: Locale, key: string): T[] {
  const data = getLocaleData(locale);
  const val = data[key];
  if (!Array.isArray(val)) return [];
  return val as T[];
}

export function tObject<T>(locale: Locale, key: string): T | null {
  const data = getLocaleData(locale);
  const val = data[key];
  if (val === null || typeof val !== 'object' || Array.isArray(val)) return null;
  return val as T;
}
