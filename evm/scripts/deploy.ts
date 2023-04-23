import '@nomiclabs/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import { ethers, upgrades } from 'hardhat'

async function deployMarvosContract() {
  const factory = await ethers.getContractFactory('Marvos')

  const protocolFees = 20 // 0.2% base fee - always charged
  const escrowFeeCommission = 500 // 5% of any fee charged by the escrow
  const maxEscrowFeePercentage = 2000 // 20% max escrow fee, min is 0%

  // If we had constructor arguments, they would be passed into deploy()
  const contract = await upgrades.deployProxy(
    factory,
    [protocolFees, escrowFeeCommission, maxEscrowFeePercentage],
    {
      initializer: 'initialize',
    },
  )

  console.log('Marvos:', contract.address)
  console.log('Marvos deployment tx hash:', contract.deployTransaction.hash)

  // The contract is NOT deployed yet; we must wait until it is mined
  await contract.deployed()
}

async function main() {
  await deployMarvosContract()
}

main().catch((error) => {
  console.error(error)
  throw error
})
