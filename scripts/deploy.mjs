/**
 * Deploy VerdictLayer contract to GenLayer Studio (studionet).
 *
 * Usage:
 *   PRIVATE_KEY=0x... node scripts/deploy.mjs
 *
 * Export your private key from Rabby:
 *   Settings → Manage Wallets → select wallet → Export Private Key
 */

import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const contractCode = readFileSync(join(__dirname, '../contract/verdict_layer.py'), 'utf8')

const PRIVATE_KEY = process.env.PRIVATE_KEY

if (!PRIVATE_KEY) {
  console.error('ERROR: Set PRIVATE_KEY env var before running.')
  console.error('  In PowerShell:  $env:PRIVATE_KEY="0x..."; node scripts/deploy.mjs')
  console.error('  In bash:        PRIVATE_KEY=0x... node scripts/deploy.mjs')
  process.exit(1)
}

async function deploy() {
  const account = createAccount(PRIVATE_KEY)
  console.log('Deployer address:', account.address)

  const client = createClient({ chain: studionet, account })

  console.log('Deploying VerdictLayer to studionet…')
  const hash = await client.deployContract({
    code: contractCode,
    args: [],
    leaderOnly: false,
  })
  console.log('Deploy tx hash:', hash)

  console.log('Waiting for finalization (this may take 30-90 seconds)…')
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: 7, // FINALIZED
    retries: 60,
    interval: 3000,
  })

  const addr =
    receipt?.contract_address ??
    receipt?.contractAddress ??
    receipt?.to ??
    null

  console.log('\n✅ Deployed!')
  if (addr) {
    console.log('CONTRACT ADDRESS:', addr)
    console.log('\nUpdate src/lib/genlayer.ts line 8:')
    console.log(`  export const CONTRACT_ADDRESS = '${addr}' as const`)
  } else {
    console.log('Full receipt (find contract address inside):')
    console.log(JSON.stringify(receipt, null, 2))
  }
}

deploy().catch((err) => {
  console.error('\nDeploy failed:', err?.message ?? err)
  process.exit(1)
})
