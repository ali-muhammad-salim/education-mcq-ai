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
        background: '#111827',
        color: '#e5e7eb',
        borderRadius: '10px',
        padding: '0.75rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.88rem',
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        ...style
      }}
    >
      <Link 
        href="/" 
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.35rem', 
          color: '#9ca3af', 
          textDecoration: 'none',
          transition: 'color 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#34d399')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
      >
        <Home size={15} />
        <span>Home</span>
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1 || item.active;
        return (
          <React.Fragment key={idx}>
            <ChevronRight size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
            {isLast || !item.href ? (
              <span style={{ 
                color: item.active || isLast ? '#34d399' : '#f3f4f6', 
                fontWeight: 700,
                whiteSpace: 'nowrap'
              }}>
                {item.label}
              </span>
            ) : (
              <Link 
                href={item.href}
                style={{ 
                  color: '#9ca3af', 
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#34d399')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
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
