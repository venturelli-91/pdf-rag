export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  pages: ParsedPage[];
}
