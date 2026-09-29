import { configProblemText } from '@/config/runtimeConfig';
import { swarmLogoUrl } from '@/design';

import './ConfigProblem.scss';

interface ConfigProblemProps {
  result: { ok: false; problem: string };
}

export function ConfigProblem({ result }: ConfigProblemProps) {
  const text = configProblemText(result);

  return (
    <main className="config-problem">
      <img src={swarmLogoUrl} alt="Swarm" className="config-problem-logo" />
      <div className="config-problem-panel" role="alert">
        <h1 className="config-problem-title">{text.title}</h1>
        <p className="config-problem-detail">{text.detail}</p>
        <p className="config-problem-hint">{text.hint}</p>
      </div>
    </main>
  );
}
