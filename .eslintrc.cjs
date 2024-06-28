/* eslint-env node */
module.exports = {
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:@typescript-eslint/strict',
		'plugin:import/recommended',
		'plugin:import/typescript',
		'plugin:deprecation/recommended'
	],
	env: {
		es2024: true
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		project: './tsconfig.json'
	},
	plugins: ['@typescript-eslint', 'unicorn', 'import'],
	root: true,
	settings: {
		'import/resolver': {
			typescript: {}
		}
	},
	rules: {
		indent: 'off',
		semi: ['error', 'never'],
		'linebreak-style': 0,
		quotes: ['error', 'single'],
		'prefer-spread': 'off',
		'no-else-return': 'off',
		'unicorn/better-regex': 'error',
		'@typescript-eslint/no-unused-vars': 'error',
		'no-unused-vars': 'off',
		'@typescript-eslint/unbound-method': 'warn'
	}
}
