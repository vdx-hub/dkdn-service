import antfu from '@antfu/eslint-config'

export default antfu(
  {
    typescript: true,
  },
  {
    // overrides
    rules: {
      'unused-imports/no-unused-imports': 'off',
      'unused-imports/no-unused-vars': 'off',
      'node/prefer-global/process': 'off',
    },
  },
)
