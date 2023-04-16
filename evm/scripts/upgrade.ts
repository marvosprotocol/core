import '@nomiclabs/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import { ethers, upgrades } from 'hardhat'

async function main() {
  const factory = await ethers.getContractFactory('ITroca')
  const contract = await upgrades.upgradeProxy(process.env.ITROCA_CONTRACT_ADDRESS, factory)

  console.log('ITroca:', contract.address)
  console.log('ITroca deployment tx hash:', contract.deployTransaction.hash)
  await contract.deployed()
}

main().catch((error) => {
  console.error(error)
  throw error
})
