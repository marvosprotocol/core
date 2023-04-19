/* eslint-disable @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access */
import {
  ITroca,
  ITroca__factory,
  SampleToken,
  SampleToken__factory,
} from '../../build/types'
import { ethers, upgrades } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { parseEther } from 'ethers/lib/utils'
import { prefills } from './prefills'
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

  const itrocaFactory = (await getContractFactory('ITroca', admin)) as ITroca__factory
  let itroca = (await upgrades.deployProxy(
    itrocaFactory,
    [protocolFees, escrowFeeCommission, maxEscrowFeePercentage],
    {
      initializer: 'initialize',
    },
  )) as ITroca
  await itroca.deployed()
  itroca = itroca.connect(alice)

  return {
    prefills,
    protocolFees,
    escrowFeeCommission,
    maxEscrowFeePercentage,
    admin,
    alice,
    bob,
    escrow,
    itroca,
  }
}
async function testWithTokenFixture() {
  const {
    prefills,
    protocolFees,
    escrowFeeCommission,
    maxEscrowFeePercentage,
    admin,
    alice,
    bob,
    escrow,
    itroca,
  } = await loadFixture(baseTestFixture)

  const tokenFactory = (await getContractFactory(
    'SampleToken',
    admin,
  )) as SampleToken__factory
  let sampleToken = (await upgrades.deployProxy(tokenFactory, [parseEther('100')], {
    initializer: 'initialize',
  })) as SampleToken
  await sampleToken.deployed()
  await sampleToken.transfer(alice.address, parseEther('10'))
  sampleToken = sampleToken.connect(alice)

  return {
    prefills,
    protocolFees,
    escrowFeeCommission,
    maxEscrowFeePercentage,
    admin,
    alice,
    bob,
    escrow,
    itroca,
    sampleToken,
  }
}
