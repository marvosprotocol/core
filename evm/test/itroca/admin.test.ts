/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */
import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ITroca, ITroca__factory } from '../../build/types'
import { randomAddressString } from 'hardhat/internal/hardhat-network/provider/utils/random'
import { getAddress } from 'ethers/lib/utils'
const { getContractFactory, getSigners } = ethers

describe('ITroca', () => {
  let itroca: ITroca
  let admin: SignerWithAddress
  let alice: SignerWithAddress
  let signers: SignerWithAddress[]

  const protocolFees = 25 // 0.2%
  const escrowFeeCommission = 500 // 5%
  const maxEscrowFeePercentage = 2000

  before(async () => {
    signers = await getSigners()
    admin = signers[0]
    alice = signers[1]
  })

  beforeEach(async () => {
    const itrocaFactory = (await getContractFactory('ITroca', admin)) as ITroca__factory
    itroca = (await upgrades.deployProxy(
      itrocaFactory,
      [protocolFees, escrowFeeCommission, maxEscrowFeePercentage],
      {
        initializer: 'initialize',
      },
    )) as ITroca
    await itroca.deployed()
    itroca = itroca.connect(alice)
  })

  describe('ITroca Admin Functions', () => {
    describe('setProtocolFeePercentage', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await expect(itroca.connect(alice).setProtocolFeePercentage(30)).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should set the protocolFeePercentage field to a new value', async () => {
          await expect(itroca.connect(admin).setProtocolFeePercentage(30))
            .to.emit(itroca, 'ProtocolFeePercentageUpdated')
            .withArgs(30)
        })
      })
    })

    describe('setDisputeHandlerFeePercentageCommission', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await expect(
            itroca.connect(alice).setDisputeHandlerFeePercentageCommission(250),
          ).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update the commission on dispute handler fees', async () => {
          await expect(
            itroca.connect(admin).setDisputeHandlerFeePercentageCommission(250),
          )
            .to.emit(itroca, 'DisputeHandlerFeePercentageCommissionUpdated')
            .withArgs(250)
        })
      })
    })

    describe('setMaxDisputeHandlerFeePercentage', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await expect(itroca.connect(alice).setMaxDisputeHandlerFeePercentage(1000)).to
            .be.reverted
        })
      })

      describe('effects', () => {
        it('should update the maximum dispute handler fee', async () => {
          await expect(itroca.connect(admin).setMaxDisputeHandlerFeePercentage(1000))
            .to.emit(itroca, 'MaxDisputeHandlerFeePercentageUpdated')
            .withArgs(1000)
        })
      })
    })

    describe('setTokenBlacklisted', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await expect(
            itroca.connect(alice).setTokenBlacklisted(randomAddressString(), true),
          ).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update a token blacklist status', async () => {
          const token = getAddress(randomAddressString())
          await expect(itroca.connect(admin).setTokenBlacklisted(token, true))
            .to.emit(itroca, 'TokenBlacklistStatusUpdated')
            .withArgs(token, admin.address, true)
        })
      })
    })

    describe('pause', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await expect(itroca.connect(alice).pause()).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should pause the contract', async () => {
          await expect(itroca.connect(admin).pause())
            .to.emit(itroca, 'Paused')
            .withArgs(admin.address)
        })
      })
    })

    describe('unpause', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await itroca.connect(admin).pause()
          await expect(itroca.connect(alice).unpause()).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should unpause the contract', async () => {
          await itroca.connect(admin).pause()
          await expect(itroca.connect(admin).unpause())
            .to.emit(itroca, 'Unpaused')
            .withArgs(admin.address)
        })
      })
    })
  })
})
