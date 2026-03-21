import { createPublicClient, http } from 'viem';
import {
  mainnet,
  base,
  optimism,
  arbitrum,
  polygon,
  gnosis,
  sepolia,
  hoodi,
} from 'viem/chains';

const ERC5564_ANNOUNCER = '0x55649E01B5Df198D18D95b5cc5051630cfD45564';
const ERC6538_REGISTRY = '0x6538E6bf4B0eBd30A8Ea093027Ac2422ce5d6538';

const CHAINS = {
  ethereum: mainnet,
  base,
  optimism,
  arbitrum,
  polygon,
  gnosis,
  sepolia,
  hoodi,
};

async function checkCode(chain, address) {
  try {
    const client = createPublicClient({
      chain,
      transport: http(),
    });
    const code = await client.getCode({ address });
    return code && code !== '0x' ? 'deployed' : 'not deployed';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `error: ${message}`;
  }
}

async function main() {
  console.log('StealthPay singleton deployment check');
  console.log(`Announcer: ${ERC5564_ANNOUNCER}`);
  console.log(`Registry:  ${ERC6538_REGISTRY}`);
  console.log('');
  console.log('chain\tannouncer\tregistry');

  for (const [name, chain] of Object.entries(CHAINS)) {
    const [announcer, registry] = await Promise.all([
      checkCode(chain, ERC5564_ANNOUNCER),
      checkCode(chain, ERC6538_REGISTRY),
    ]);
    console.log(`${name}\t${announcer}\t${registry}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
