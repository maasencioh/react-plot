import { ReactNode, SVGProps } from 'react';

import { usePosition } from '../../hooks';

export interface AnnotationTextProps
  extends Omit<
    SVGProps<SVGTextElement>,
    'x1' | 'y1' | 'x2' | 'y2' | 'x' | 'y' | 'fill'
  > {
  x: number | string;
  y: number | string;
  color?: string;
  children: ReactNode;
}

export function Text(props: AnnotationTextProps) {
  const { x: xOld, y: yOld, children, color, ...otherProps } = props;

  const { x, y } = usePosition({ x: xOld, y: yOld });

  return (
    <text x={x} y={y} fill={color} {...otherProps}>
      {children}
    </text>
  );
}