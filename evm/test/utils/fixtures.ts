/* eslint-disable @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access */
import {
  Marvos,
  Marvos__factory,
  SampleToken,
  SampleToken__factory,
} from '../../build/types'
import { ethers, upgrades } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { parseEther } from 'ethers/lib/utils'
const { getContractFactory, getSigners } = ethers

export async function loadBaseTestFixture() {
  return await loadFixture(baseTestFixture)
}

export async function loadTestWithTokenFixture() {
  return await loadFixture(testWithTokenFixture)
}

async function baseTestFixture() {
  const protocolFees = 25 // 0.2%
  const escrowFeeCommission = 500 // 5%
  const maxEscrowFeePercentage = 2000

  const signers = await getSigners()
  const [admin, alice, bob, escrow] = signers

  const marvosFactory = (await getContractFactory('Marvos', admin)) as Marvos__factory
  let marvos = (await upgrades.deployProxy(
    marvosFactory,
    [protocolFees, escrowFeeCommission, maxEscrowFeePercentage],
    {
      initializer: 'initialize',
    },
  )) as Marvos
  await marvos.deployed()
  marvos = marvos.connect(alice)

  return {
    admin,
    alice,
    bob,
    escrow,
    marvos,
  }
}
async function testWithTokenFixture() {
  const { admin, alice, bob, escrow, marvos } = await loadFixture(baseTestFixture)

  const tokenFactory = (await getContractFactory(
    'SampleToken',
    admin,
  )) as SampleToken__factory
  let sampleToken = (await upgrades.deployProxy(tokenFactory, [parseEther('100')], {
    initializer: 'initialize',
  })) as SampleToken
  await sampleToken.deployed()
  sampleToken = sampleToken.connect(alice)

  return {
    admin,
    alice,
    bob,
    escrow,
    marvos,
    sampleToken,
  }
}
