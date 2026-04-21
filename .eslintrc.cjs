const firebaseRulesPlugin = require('@firebase/eslint-plugin-security-rules');

module.exports = [
  ...firebaseRulesPlugin.configs['flat/recommended'],
  {
    files: ['firestore.rules', 'DRAFT_firestore.rules'],
  }
];
