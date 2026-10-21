'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  style?: React.CSSProperties;
}

export default function Breadcrumbs({ items, style }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        background: 'transparent',
        color: 'var(--text-color)',
        borderRadius: '10px',
        padding: '0',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.88rem',
        fontWeight: 500,
        boxShadow: 'none',
        ...style
      }}
    >
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          color: 'var(--text-light)',
          textDecoration: 'none',
          minHeight: '44px',
          transition: 'color 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-color)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-light)')}
      >
        <Home size={15} />
        <span>Home</span>
      </Link>

      {items.filter(item => item.href !== '/').map((item, idx, visibleItems) => {
        const isLast = idx === visibleItems.length - 1 || item.active;
        return (
          <React.Fragment key={idx}>
            <ChevronRight size={14} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
            {isLast || !item.href ? (
              <span aria-current={isLast ? 'page' : undefined} style={{
                color: item.active || isLast ? 'var(--primary-color)' : 'var(--text-color)',
                fontWeight: 700,
                overflowWrap: 'anywhere'
              }}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                style={{
                  color: 'var(--text-light)',
                  textDecoration: 'none',
                  minHeight: '44px', display: 'inline-flex', alignItems: 'center',
                  overflowWrap: 'anywhere',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-color)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-light)')}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
