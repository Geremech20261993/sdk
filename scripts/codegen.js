#!/usr/bin/env node
/**
 * SoroSave SDK Code Generator
 * 
 * Auto-generates TypeScript client code from Soroban contract spec.
 * Usage: node scripts/codegen.js
 */

const fs = require('fs');
const path = require('path');

// Contract specification
const contractSpec = {
  functions: [
    {
      name: 'create_group',
      params: [
        { name: 'admin', type: 'Address' },
        { name: 'name', type: 'string' },
        { name: 'token', type: 'Address' },
        { name: 'contribution_amount', type: 'i128' },
        { name: 'cycle_length', type: 'u64' },
        { name: 'max_members', type: 'u32' }
      ],
      returns: 'u64',
      docs: 'Create a new savings group'
    },
    {
      name: 'join_group',
      params: [
        { name: 'member', type: 'Address' },
        { name: 'group_id', type: 'u64' }
      ],
      docs: 'Join an existing group'
    },
    {
      name: 'leave_group',
      params: [
        { name: 'member', type: 'Address' },
        { name: 'group_id', type: 'u64' }
      ],
      docs: 'Leave a group (only while forming)'
    },
    {
      name: 'start_group',
      params: [
        { name: 'group_id', type: 'u64' }
      ],
      docs: 'Start the savings cycle'
    },
    {
      name: 'contribute',
      params: [
        { name: 'member', type: 'Address' },
        { name: 'group_id', type: 'u64' },
        { name: 'amount', type: 'i128' }
      ],
      docs: 'Make a contribution'
    },
    {
      name: 'distribute',
      params: [
        { name: 'group_id', type: 'u64' }
      ],
      docs: 'Distribute funds to recipient'
    },
    {
      name: 'get_group',
      params: [
        { name: 'group_id', type: 'u64' }
      ],
      returns: 'SavingsGroup',
      docs: 'Get group details'
    },
    {
      name: 'get_groups',
      params: [],
      returns: 'Vec\u003cSavingsGroup\u003e',
      docs: 'List all groups'
    }
  ],
  types: [
    {
      name: 'SavingsGroup',
      fields: [
        { name: 'id', type: 'u64' },
        { name: 'name', type: 'string' },
        { name: 'admin', type: 'Address' },
        { name: 'token', type: 'Address' },
        { name: 'contribution_amount', type: 'i128' },
        { name: 'cycle_length', type: 'u64' },
        { name: 'max_members', type: 'u32' },
        { name: 'current_round', type: 'u32' },
        { name: 'status', type: 'GroupStatus' },
        { name: 'members', type: 'Vec\u003cAddress\u003e' },
        { name: 'created_at', type: 'u64' }
      ],
      docs: 'Savings group data structure'
    },
    {
      name: 'RoundInfo',
      fields: [
        { name: 'round_number', type: 'u32' },
        { name: 'recipient', type: 'Address' },
        { name: 'contribution_amount', type: 'i128' },
        { name: 'total_collected', type: 'i128' },
        { name: 'status', type: 'RoundStatus' },
        { name: 'contributions', type: 'Map\u003cAddress, i128\u003e' }
      ],
      docs: 'Round information'
    }
  ]
};

const typeMapping = {
  'u32': 'number',
  'u64': 'number',
  'i32': 'number',
  'i64': 'number',
  'i128': 'bigint',
  'u128': 'bigint',
  'bool': 'boolean',
  'string': 'string',
  'Address': 'string',
  'Vec\u003cAddress\u003e': 'string[]',
  'Map\u003cAddress, i128\u003e': 'Map\u003cstring, bigint\u003e',
  'Vec\u003cSavingsGroup\u003e': 'SavingsGroup[]',
  'SavingsGroup': 'SavingsGroup',
  'RoundInfo': 'RoundInfo',
  'GroupStatus': 'GroupStatus',
  'RoundStatus': 'RoundStatus'
};

function mapType(sorobanType) {
  return typeMapping[sorobanType] || sorobanType;
}

function generateTypes() {
  let code = '// Auto-generated types from contract spec\n\n';
  
  code += `export enum GroupStatus {\n`;
  code += `  Forming = 0,\n`;
  code += `  Active = 1,\n`;
  code += `  Completed = 2,\n`;
  code += `  Cancelled = 3\n`;
  code += `}\n\n`;
  
  code += `export enum RoundStatus {\n`;
  code += `  Pending = 0,\n`;
  code += `  Collecting = 1,\n`;
  code += `  Completed = 2\n`;
  code += `}\n\n`;
  
  contractSpec.types.forEach(type => {
    code += `/**\n * ${type.docs}\n */\n`;
    code += `export interface ${type.name} {\n`;
    type.fields.forEach(field => {
      code += `  ${field.name}: ${mapType(field.type)};\n`;
    });
    code += `}\n\n`;
  });
  
  return code;
}

function generateClient() {
  let code = '// Auto-generated client from contract spec\n\n';
  code += `import * as StellarSdk from "@stellar/stellar-sdk";\n`;
  code += `import { SavingsGroup, RoundInfo, GroupStatus, RoundStatus } from "./types";\n\n`;
  
  code += `export interface SoroSaveConfig {\n`;
  code += `  rpcUrl: string;\n`;
  code += `  contractId: string;\n`;
  code += `  networkPassphrase: string;\n`;
  code += `}\n\n`;
  
  code += `/**\n * Auto-generated SoroSave SDK client\n * Generated from contract spec\n */\n`;
  code += `export class GeneratedSoroSaveClient {\n`;
  code += `  private server: StellarSdk.rpc.Server;\n`;
  code += `  private contractId: string;\n`;
  code += `  private networkPassphrase: string;\n\n`;
  
  code += `  constructor(config: SoroSaveConfig) {\n`;
  code += `    this.server = new StellarSdk.rpc.Server(config.rpcUrl);\n`;
  code += `    this.contractId = config.contractId;\n`;
  code += `    this.networkPassphrase = config.networkPassphrase;\n`;
  code += `  }\n\n`;
  
  contractSpec.functions.forEach(func => {
    code += `  /**\n`;
    code += `   * ${func.docs}\n`;
    code += `   */\n`;
    
    const params = func.params.map(p => `${p.name}: ${mapType(p.type)}`).join(', ');
    const returnType = func.returns ? `Promise\u003c${mapType(func.returns)}\u003e` : 'Promise\u003cStellarSdk.Transaction\u003e';
    
    code += `  async ${func.name.replace(/_/g, '')}(${params}, source: string): ${returnType} {\n`;
    code += `    const contract = new StellarSdk.Contract(this.contractId);\n`;
    
    const args = func.params.map(p => {
      if (p.type === 'Address') return `new StellarSdk.Address(${p.name}).toScVal()`;
      if (p.type === 'string') return `StellarSdk.nativeToScVal(${p.name}, { type: "string" })`;
      if (p.type === 'i128') return `StellarSdk.nativeToScVal(${p.name}, { type: "i128" })`;
      if (p.type === 'u64') return `StellarSdk.nativeToScVal(${p.name}, { type: "u64" })`;
      if (p.type === 'u32') return `StellarSdk.nativeToScVal(${p.name}, { type: "u32" })`;
      return p.name;
    }).join(', ');
    
    code += `    const op = contract.call("${func.name}"${args ? ', ' + args : ''});\n`;
    code += `    return this.buildTransaction(op, source);\n`;
    code += `  }\n\n`;
  });
  
  code += `  private buildTransaction(op: StellarSdk.xdr.Operation, source: string): StellarSdk.Transaction {\n`;
  code += `    const account = new StellarSdk.Account(source, '0');\n`;
  code += `    const tx = new StellarSdk.TransactionBuilder(account, {\n`;
  code += `      fee: '100',\n`;
  code += `      networkPassphrase: this.networkPassphrase\n`;
  code += `    }).addOperation(op).setTimeout(30).build();\n`;
  code += `    return tx;\n`;
  code += `  }\n`;
  
  code += `}\n`;
  
  return code;
}

function main() {
  console.log('🚀 SoroSave SDK Code Generator\n');
  
  const genDir = path.join(__dirname, '..', 'generated');
  
  if (!fs.existsSync(genDir)) {
    fs.mkdirSync(genDir, { recursive: true });
    console.log('✅ Created generated/ directory');
  }
  
  const typesCode = generateTypes();
  fs.writeFileSync(path.join(genDir, 'types.ts'), typesCode);
  console.log('✅ Generated generated/types.ts');
  
  const clientCode = generateClient();
  fs.writeFileSync(path.join(genDir, 'client.ts'), clientCode);
  console.log('✅ Generated generated/client.ts');
  
  const indexCode = `// Auto-generated SDK exports\nexport * from './types';\nexport * from './client';\n`;
  fs.writeFileSync(path.join(genDir, 'index.ts'), indexCode);
  console.log('✅ Generated generated/index.ts');
  
  console.log('\n📊 Generation Summary:');
  console.log(`  - ${contractSpec.functions.length} functions generated`);
  console.log(`  - ${contractSpec.types.length} types generated`);
  console.log('\n🎉 Code generation complete!');
  console.log('\nNext steps:');
  console.log('  1. Review generated code in generated/ directory');
  console.log('  2. Run TypeScript check: npx tsc --noEmit generated/*.ts');
  console.log('  3. Copy useful parts to src/ directory');
}

main();
