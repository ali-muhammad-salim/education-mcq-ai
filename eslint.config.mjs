import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['node_modules/**', '.next/**', 'frontend/**', 'student-web/**', 'checkpoints/**', 'data/**', 'public/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'], languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { 'no-debugger': 'error', 'no-constant-condition': 'error', 'no-duplicate-case': 'error', 'constructor-super': 'error', 'no-unreachable': 'error' },
  },
  { files: ['repositories/**/*.ts', 'services/**/*.ts', 'lib/validations/**/*.ts', 'tests/**/*.ts'], plugins: { '@typescript-eslint': tseslint.plugin }, rules: { '@typescript-eslint/no-explicit-any': 'error' } },
);
