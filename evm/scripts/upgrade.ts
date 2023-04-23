import '@nomiclabs/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import { ethers, upgrades } from 'hardhat'

async function main() {
  const factory = await ethers.getContractFactory('Marvos')
  const contract = await upgrades.upgradeProxy(
    process.env.MARVOS_CONTRACT_ADDRESS,
    factory,
  )

  console.log('Marvos:', contract.address)
  console.log('Marvos deployment tx hash:', contract.deployTransaction.hash)
  await contract.deployed()
}

main().catch((error) => {
  console.error(error)
  throw error
})
