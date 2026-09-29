import { configProblemText } from '@/config/runtimeConfig';

import './ConfigProblem.scss';

interface ConfigProblemProps {
  result: { ok: false; problem: string };
}

export function ConfigProblem({ result }: ConfigProblemProps) {
  const text = configProblemText(result);

  return (
    <div className="config-problem" role="alert">
      <h1 className="config-problem-title">{text.title}</h1>
      <p className="config-problem-detail">{text.detail}</p>
      <p className="config-problem-hint">{text.hint}</p>
    </div>
  );
}
