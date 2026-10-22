import {describe,it,expect} from 'vitest';
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

/** Follow runtime imports, as the browser bundler does. Server-side unit tests
 * alone cannot catch database helpers accidentally imported by a client page. */
function browserDependencies(entry:string){
 const visited=new Set<string>(),forbidden:string[]=[];
 function visit(file:string,chain:string[]){
  if(visited.has(file))return;visited.add(file);
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  function dependency(specifier:string){
   if(specifier==='@prisma/client'||specifier==='server-only'||specifier.startsWith('node:'))forbidden.push([...chain,specifier].join(' → '));
   if(!specifier.startsWith('@/')&&!specifier.startsWith('.'))return;
   const base=specifier.startsWith('@/')?path.resolve(specifier.slice(2)):path.resolve(path.dirname(file),specifier);
   const resolved=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts'),path.join(base,'index.tsx')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
   if(resolved&&/\.tsx?$/.test(resolved))visit(resolved,[...chain,path.relative(process.cwd(),resolved)]);
  }
  function scan(node:ts.Node){
   if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)){
    const clause=node.importClause,bindings=clause?.namedBindings;
    const onlyTypes=clause?.isTypeOnly||(!clause?.name&&bindings&&ts.isNamedImports(bindings)&&bindings.elements.every(e=>e.isTypeOnly));
    if(!onlyTypes)dependency(node.moduleSpecifier.text);
   }
   if(ts.isExportDeclaration(node)&&!node.isTypeOnly&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))dependency(node.moduleSpecifier.text);
   if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(node.arguments[0]))dependency(node.arguments[0].text);
   ts.forEachChild(node,scan);
  }
  scan(source);
 }
 visit(path.resolve(entry),[entry]);return forbidden;
}
describe('Learning page browser boundaries',()=>{
 it.each(['components/PaperViewerClient.tsx','app/[board]/[class]/[subject]/mcqs/McqsClient.tsx','app/[board]/[class]/[subject]/syllabus/SyllabusClient.tsx'])('%s never bundles database code',entry=>{
  expect(browserDependencies(entry)).toEqual([]);
 });
});
