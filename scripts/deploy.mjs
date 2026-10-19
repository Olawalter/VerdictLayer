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
  // waitForTransactionReceipt compares the status as a string and times out on a numeric 7,
  // so poll the transaction directly.
  let receipt
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    receipt = await client.getTransaction({ hash })
    if (receipt?.statusName === 'FINALIZED') break
  }
  if (receipt?.statusName !== 'FINALIZED') throw new Error(`Deploy not finalized (status: ${receipt?.statusName})`)

  const addr =
    receipt?.recipient ??
    receipt?.contract_address ??
    receipt?.contractAddress ??
    receipt?.to ??
    null

  console.log('\n✅ Deployed!')
  if (addr) {
    console.log('CONTRACT ADDRESS:', addr)
    console.log('\nPoint the frontend at it (e.g. in .env.local):')
    console.log(`  NEXT_PUBLIC_VERDICTLAYER_ADDRESS=${addr}`)
  } else {
    console.log('Full receipt (find contract address inside):')
    console.log(JSON.stringify(receipt, null, 2))
  }
}

deploy().catch((err) => {
  console.error('\nDeploy failed:', err?.message ?? err)
  process.exit(1)
})
