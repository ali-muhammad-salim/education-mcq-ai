import MathText from './MathText';

export default function McqOptionReasons({ reasons, accepted = [] }: {
  reasons: Record<string, string | undefined>;
  accepted?: string[];
}) {
  const items = Object.entries(reasons).filter(([, reason]) => Boolean(reason));
  if (!items.length) return null;
  return (
    <details>
      <summary>Reasoning for each option</summary>
      <ul>
        {items.map(([key, reason]) => (
          <li key={key}>
            <strong>{key}{accepted.includes(key) ? ' (accepted)' : ''}.</strong> <MathText text={reason!} />
          </li>
        ))}
      </ul>
    </details>
  );
}
