import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const sources = vi.hoisted(() => ({ published: vi.fn() }));
vi.mock('@/services/materials/curriculum', () => ({ publishedCurriculum: sources.published }));
vi.mock('@/services/materials/catalog', () => ({ subjectMaterials: async () => [] }));
vi.mock('@/components/Breadcrumbs', () => ({ default: () => null }));
vi.mock('@/components/DocumentViews', () => ({ default: () => null }));
vi.mock('@/components/MaterialList', () => ({ default: () => null }));
vi.mock('@/app/[board]/[class]/[subject]/syllabus/SyllabusClient', () => ({ default: () => null }));
import Page from '@/app/[board]/[class]/[subject]/syllabus/page';

function elements(value: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  return React.Children.toArray(value).flatMap(child => {
    if (!React.isValidElement<Record<string, unknown>>(child)) return [];
    return [child, ...elements(child.props.children as React.ReactNode)];
  });
}
beforeEach(() => {
  vi.stubGlobal('React', React);
  sources.published.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

describe('Syllabus source consistency', () => {
  it.each(['physics', 'computer-science', 'chemistry', 'mathematics'])('pairs compiled %s outcomes with their own original PDF', async subject => {
    const units = [{ number: 1, title: 'Published replacement', subtopics: [] }];
    sources.published.mockResolvedValue({ original: '/api/materials/replacement/original', units });
    const tree = elements(await Page({ params: Promise.resolve({ board: 'akueb', class: 'ix', subject }) }));
    const viewer = tree.find(element => 'original' in element.props)!;
    const syllabus = tree.find(element => 'units' in element.props)!;
    expect(syllabus.props.units).toBe(units);
    expect(viewer.props.original).toBe('/api/materials/replacement/original');
    expect(syllabus.props.originalUrl).toBe('/api/materials/replacement/original');
    expect(syllabus.props.physicsSections).toBeNull();
  });
  it('retains the dedicated bundled PDF when there is no published replacement', async () => {
    sources.published.mockResolvedValue(null);
    const tree = elements(await Page({ params: Promise.resolve({ board: 'akueb', class: 'ix', subject: 'physics' }) }));
    expect(tree.find(element => 'original' in element.props)!.props.original).toBe('/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf');
  });
});
