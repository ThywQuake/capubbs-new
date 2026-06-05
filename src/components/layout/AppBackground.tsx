import bicycleIcon from '../../assets/bg/bicycle.svg';
import screwIcon from '../../assets/bg/screw.svg';

const columns = 10;
const rows = 10;
const cellSize = 72;
const symbolWidth = 54;
const symbolHeight = 42;
const patternWidth = columns * cellSize;
const patternHeight = rows * cellSize;
const symbols = Array.from({ length: rows }, (_, row) => {
  const bicycleColumn = (row * 3) % columns;
  const screwColumn = (bicycleColumn + 5) % columns;

  return [
    { key: `bicycle-${row}`, icon: bicycleIcon, column: bicycleColumn, row, rotation: -15 },
    { key: `screw-${row}`, icon: screwIcon, column: screwColumn, row, rotation: 0 },
  ];
}).flat();

function renderPatternSymbols(opacity: number) {
  return symbols.map((symbol) => (
    <image
      key={`${symbol.key}-${opacity}`}
      href={symbol.icon}
      x={symbol.column * cellSize + (cellSize - symbolWidth) / 2}
      y={symbol.row * cellSize + (cellSize - symbolHeight) / 2}
      width={symbolWidth}
      height={symbolHeight}
      opacity={opacity}
      filter="url(#capubbs-symbol-tint)"
      transform={
        symbol.rotation === 0
          ? undefined
          : `rotate(${symbol.rotation} ${symbol.column * cellSize + cellSize / 2} ${
              symbol.row * cellSize + cellSize / 2
            })`
      }
      preserveAspectRatio="xMidYMid meet"
    />
  ));
}

export function AppBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden bg-[#A4C1AC] dark:bg-[#04160B]">
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="capubbs-symbol-tint" colorInterpolationFilters="sRGB">
            <feFlood floodColor="#FFFFFF" result="symbolColor" />
            <feComposite in="symbolColor" in2="SourceAlpha" operator="in" />
          </filter>
          <pattern
            id="capubbs-background-symbols-light"
            width={patternWidth}
            height={patternHeight}
            patternUnits="userSpaceOnUse"
          >
            {renderPatternSymbols(0.25)}
          </pattern>
          <pattern
            id="capubbs-background-symbols-dark"
            width={patternWidth}
            height={patternHeight}
            patternUnits="userSpaceOnUse"
          >
            {renderPatternSymbols(0.1)}
          </pattern>
        </defs>
        <rect className="dark:hidden" width="100%" height="100%" fill="url(#capubbs-background-symbols-light)" />
        <rect className="hidden dark:block" width="100%" height="100%" fill="url(#capubbs-background-symbols-dark)" />
      </svg>
    </div>
  );
}
