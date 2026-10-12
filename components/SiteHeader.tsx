import React from 'react';
import { Briefcase, Code } from 'lucide-react';
import { PRODUCT_NAME, PROJECT_LINKS } from '../config/project';

// Shared shell header (padrao-projetos A.9). The product name here is a link, not the page h1.
const SiteHeader: React.FC = () => (
  <header className="ms-header">
    <div className="ms-container ms-header__inner">
      <a className="ms-header__brand" href="/">
        <img src="/favicon.svg" alt="" width={28} height={28} />
        <span>{PRODUCT_NAME}</span>
      </a>
      <nav className="ms-header__nav" aria-label="Projeto">
        <a className="ms-nav-link" href={PROJECT_LINKS.portfolioCase} title="Portfólio">
          <Briefcase size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="ms-nav-link__label">Portfólio</span>
        </a>
        <a
          className="ms-nav-link"
          href={PROJECT_LINKS.repository}
          target="_blank"
          rel="noopener noreferrer"
          title="Código"
        >
          <Code size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="ms-nav-link__label">Código</span>
          <span className="ms-sr-only"> (abre em nova aba)</span>
        </a>
      </nav>
    </div>
  </header>
);

export default SiteHeader;
