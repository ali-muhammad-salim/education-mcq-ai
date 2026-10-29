import MathText from '@/components/MathText';

export default function LatexRenderer({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  return <MathText text={text} className={className} style={style} />;
}
