export interface CodeChangedResult {
  codeFile: string,
  line: number, 
  column: number, 
  workspace_seq: number
}

export function calculateRowColumn(str: string, index: number) : [number, number] {
  // Escape unicode.
  const symbols = [...str];

  if (index >= symbols.length) {
    throw Error("Index exceeds string length");
  }

  let row = 1, column = 0;
  for(let i = 0; i <= index; i++) {
    if (symbols[i] === '\n') {
      column = 0;
      row += 1;
    } else {
      column += 1;
    }
  }
  return [row, column];
}