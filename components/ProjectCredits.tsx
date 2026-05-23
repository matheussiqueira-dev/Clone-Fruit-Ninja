import React from 'react';

const ProjectCredits: React.FC = () => (
  <footer className="pointer-events-auto px-4 pb-4 md:px-6 md:pb-6">
    <div className="glass-card ms-panel-edge flex flex-col gap-2 rounded-lg border px-4 py-3 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
      <span>Desenvolvido por Matheus Siqueira</span>
      <a
        href="https://www.matheussiqueira.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center rounded-full border border-cyan-300/25 px-3 py-1 text-xs font-medium text-cyan-100 transition hover:border-cyan-200/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        www.matheussiqueira.dev
      </a>
    </div>
  </footer>
);

export default ProjectCredits;
