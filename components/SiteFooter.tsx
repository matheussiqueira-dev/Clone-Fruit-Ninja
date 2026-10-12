import React from 'react';
import { APP_VERSION, COMMIT_SHA, PRODUCT_NAME } from '../config/project';

// Author footer from padrao-projetos A.9. The strings are fixed byte for byte; only the meta line varies.
const SiteFooter: React.FC = () => {
  const meta = [PRODUCT_NAME, `v${APP_VERSION}`, COMMIT_SHA].filter(Boolean).join(' · ');

  return (
    <footer className="ms-footer">
      <div className="ms-container ms-footer__inner">
        <p className="ms-footer__signature">
          <a href="https://www.matheussiqueira.dev">Desenvolvido por Matheus Siqueira</a>
          <span aria-hidden="true">|</span>
          <a href="https://www.matheussiqueira.dev">www.matheussiqueira.dev</a>
        </p>
        <nav className="ms-footer__links" aria-label="Links do autor">
          <a href="https://www.linkedin.com/in/matheussiqueira-dev" target="_blank" rel="noopener noreferrer">LinkedIn<span className="ms-sr-only"> (abre em nova aba)</span></a>
          <a href="https://github.com/matheussiqueira-dev" target="_blank" rel="noopener noreferrer">GitHub<span className="ms-sr-only"> (abre em nova aba)</span></a>
          <a href="https://github.com/matheussiqueira-dev/Clone-Fruit-Ninja" target="_blank" rel="noopener noreferrer">Código deste projeto<span className="ms-sr-only"> (abre em nova aba)</span></a>
        </nav>
        <p className="ms-footer__meta">{meta}</p>
      </div>
    </footer>
  );
};

export default SiteFooter;
