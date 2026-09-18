import tokenizer from 'components/CodeEditorCMP/jsx2json/jsx.tokenizer';
import parser from 'components/CodeEditorCMP/jsx2json/jsx.parser';
import type { Jsx2JsonOptions, ASTNode } from 'components/CodeEditorCMP/types';

export default function jsx2json(input: string, opts: Jsx2JsonOptions = {}): ASTNode | ASTNode[] {
    return parser(tokenizer(input), opts);
}