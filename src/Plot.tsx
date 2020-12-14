import { max, min } from 'd3-array';
import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { schemeSet1 } from 'd3-scale-chromatic';
import React, { useMemo, useReducer } from 'react';

import { PlotContext, DispatchContext } from './hooks';
import type { PlotProps, SeriesType, ReducerActions } from './types';
import { splitChildren } from './utils';

interface State {
  series: SeriesType[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  xFlip: boolean;
  yFlip: boolean;
}

function reducer(state: State, action: ReducerActions): State {
  switch (action.type) {
    case 'newData': {
      const { series } = state;
      const serieItem = action.value;
      return { ...state, series: [...series, serieItem] };
    }
    case 'removeData': {
      const { id } = action.value;
      const seriesFiltered = state.series.filter((series) => series.id !== id);
      return { ...state, series: seriesFiltered };
    }
    case 'xMinMax': {
      const { min: xMin, max: xMax } = action.value;
      return { ...state, xMin, xMax };
    }
    case 'yMinMax': {
      const { min: yMin, max: yMax } = action.value;
      return { ...state, yMin, yMax };
    }
    case 'xPadding': {
      const { min: paddingLeft, max: paddingRight } = action.value;
      return { ...state, paddingLeft, paddingRight };
    }
    case 'yPadding': {
      const { min: paddingBottom, max: paddingTop } = action.value;
      return { ...state, paddingBottom, paddingTop };
    }
    case 'flip': {
      const { flip, axis } = action.value;
      return { ...state, [axis === 'x' ? 'xFlip' : 'yFlip']: flip };
    }
    default: {
      throw new Error();
    }
  }
}

export default function Plot({
  width,
  height,
  margin = {},
  colorScheme,
  children,
}: PlotProps) {
  const initialState = {
    series: [],
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    xFlip: false,
    yFlip: false,
  };
  const [state, dispatch] = useReducer(reducer, initialState, undefined);

  const compoundComp = splitChildren(children);
  const { invalidChild, lineSeries, axis, heading, legend } = compoundComp;
  if (invalidChild) {
    throw new Error('Only compound components of Plot are displayed');
  }

  // Distances in plot
  const { left = 0, right = 0, top = 0, bottom = 0 } = margin;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  // Set scales
  const { xScale, xMin, xMax } = useMemo(() => {
    const xMin =
      state.xMin !== undefined ? state.xMin : min(state.series, (d) => d.xMin);
    const xMax =
      state.xMax !== undefined ? state.xMax : max(state.series, (d) => d.xMax);

    if ([xMin, xMax].includes(undefined)) return {};
    if (xMin > xMax) {
      throw new Error(`X: min (${xMin}) is bigger than max (${xMax})`);
    }

    const leftPad = (xMax - xMin) * state.paddingLeft;
    const rightPad = (xMax - xMin) * state.paddingRight;

    return {
      xMin,
      xMax,
      xScale: scaleLinear()
        .domain([xMin - leftPad, xMax + rightPad])
        .range(state.xFlip ? [width - right, left] : [left, width - right]),
    };
  }, [state, left, right, width]);

  const { yScale, yMin, yMax } = useMemo(() => {
    // Get limits from state or data
    const yMin =
      state.yMin !== undefined ? state.yMin : min(state.series, (d) => d.yMin);
    const yMax =
      state.yMax !== undefined ? state.yMax : max(state.series, (d) => d.yMax);
    // Limits validation
    if ([yMin, yMax].includes(undefined)) return {};
    if (yMin > yMax) {
      throw new Error(`Y: min (${yMin}) is bigger than max (${yMax})`);
    }

    // Limits paddings
    const topPad = (yMax - yMin) * state.paddingTop;
    const bottomPad = (yMax - yMin) * state.paddingBottom;
    return {
      yMin,
      yMax,
      yScale: scaleLinear()
        .domain([yMin - bottomPad, yMax + topPad])
        .range(state.yFlip ? [top, height - bottom] : [height - bottom, top]),
    };
  }, [state, bottom, top, height]);

  const labels = state.series.map(({ label }) => label);
  const ids = state.series.map(({ id }) => id);
  const colorScaler = useMemo(
    () =>
      scaleOrdinal<string>()
        .range(colorScheme || schemeSet1)
        .domain(ids),
    [colorScheme, ids],
  );

  const xDiff = xMax - xMin;
  const yDiff = yMax - yMin;

  return (
    <PlotContext.Provider
      value={{
        xScale,
        yScale,
        width,
        height,
        left,
        right,
        top,
        bottom,
        plotWidth,
        plotHeight,
        labels,
        colorScaler,
        xScientific: xDiff <= 0.01 || xDiff >= 1000,
        yScientific: yDiff <= 0.01 || yDiff >= 1000,
      }}
    >
      <DispatchContext.Provider value={{ dispatch }}>
        <svg
          width={width}
          height={height}
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          {heading}
          {legend}
          {axis.x}
          {axis.y}

          {/* Defines the borders of the plot space */}
          <clipPath id="squareClip">
            <rect
              fillOpacity="0"
              x={left}
              y={top}
              width={plotWidth}
              height={plotHeight}
            />
          </clipPath>
          <g style={{ clipPath: 'url(#squareClip)' }}>{lineSeries}</g>
        </svg>
      </DispatchContext.Provider>
    </PlotContext.Provider>
  );
}